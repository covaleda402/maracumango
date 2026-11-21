import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { isDatabaseConfigured, query } from './db';
import { authenticate } from './middleware/auth';

import branchesRouter from './routes/branches';
import categoriesRouter from './routes/categories';
import ingredientsRouter from './routes/ingredients';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import settingsRouter from './routes/settings';
import authRouter from './routes/auth';

import { initOrderRetentionScheduler } from './services/orderRetention';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security Headers Middleware (OWASP alignment / Strix recommendations)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// CORS configuration - Strict whitelist for production Vercel domains, preview deployments, and local dev
const explicitOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check explicit allowed origins
      if (explicitOrigins.includes(origin)) return callback(null, true);

      // Allow local development ports
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview and production deployments (*.vercel.app)
      if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // If in non-production, allow to facilitate testing
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(new Error('Bloqueado por política CORS'));
    },
    credentials: true,
  })
);

// High-capacity JSON & URL encoded parsing for base64 images and logos
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Initialize automatic backend order retention cleanup (in server/daemon environments)
if (!process.env.VERCEL) {
  initOrderRetentionScheduler();
}

// Global auth & role extraction middleware
app.use(authenticate);

// API Router definition
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', async (_req, res) => {
  const dbConnected = isDatabaseConfigured();
  let dbCheck = false;
  if (dbConnected) {
    try {
      await query('SELECT 1');
      dbCheck = true;
    } catch {
      dbCheck = false;
    }
  }

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development'),
    database: {
      engine: 'Neon PostgreSQL',
      configured: dbConnected,
      connected: dbCheck,
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount modular route handlers
apiRouter.use('/branches', branchesRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/ingredients', ingredientsRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/orders', ordersRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/auth', authRouter);

// Mount router under both /api and root / for resilience across serverless rewrites and dev proxy
app.use('/api', apiRouter);
app.use(apiRouter);

// 404 handler for unmatched API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Start local listener only when running standalone (not in Vercel serverless functions)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🥭 SERVIDOR BACKEND MARACUMANGO CORRIENDO`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🗄️ Neon PostgreSQL: ${isDatabaseConfigured() ? 'CONFIGURADO ✅' : 'PENDIENTE EN .env ⚠️'}`);
    console.log(`====================================================`);
  });
}

export default app;
