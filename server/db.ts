import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

let pool: Pool | null = null;

if (connectionString) {
  // Neon PostgreSQL connection with SSL enabled
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('⚠️ [Neon PostgreSQL Pool Error]:', err.message);
  });
} else {
  console.warn('⚠️ [Database]: DATABASE_URL no configurada en .env. El backend operará en modo informativo/fallback.');
}

export const isDatabaseConfigured = (): boolean => {
  return pool !== null;
};

let schemaEnsuredPromise: Promise<void> | null = null;

export const ensureSchema = async (): Promise<void> => {
  if (!pool) return;
  if (!schemaEnsuredPromise) {
    schemaEnsuredPromise = (async () => {
      try {
        await pool.query(`
          -- 1. Ensure Roles
          CREATE TABLE IF NOT EXISTS roles (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description TEXT
          );

          INSERT INTO roles (id, name, description) VALUES
            ('ADMIN', 'Administrador', 'Acceso total a todas las sedes'),
            ('WORKER', 'Trabajador', 'Acceso operativo restringido'),
            ('CUSTOMER', 'Cliente', 'Cliente registrado')
          ON CONFLICT (id) DO NOTHING;

          -- 2. Ensure columns on users table
          ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address VARCHAR(255);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT TRUE;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

          -- 3. Ensure columns on orders table
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50);
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(150);

          -- 4. Password reset tokens table
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id VARCHAR(100) PRIMARY KEY,
            user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
            email VARCHAR(150) NOT NULL,
            code VARCHAR(10) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            attempts INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- 5. Security attempt logs (for rate limiting and lockouts)
          CREATE TABLE IF NOT EXISTS security_attempt_logs (
            identifier VARCHAR(150) PRIMARY KEY,
            attempt_count INT NOT NULL DEFAULT 1,
            blocked_until TIMESTAMPTZ,
            last_attempt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
          );

          -- 6. Indexes for performance and safety
          ALTER TABLE password_reset_tokens ADD COLUMN IF NOT EXISTS token_hash VARCHAR(100);
          ALTER TABLE password_reset_tokens ALTER COLUMN code DROP NOT NULL;
          CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
          CREATE INDEX IF NOT EXISTS idx_reset_email_code ON password_reset_tokens(email, code);
          CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);

          -- 7. Self-healing cleanup: Purge deleted/covaleda branches and fix customer roles
          UPDATE users SET branch_id = 'sede-1' WHERE branch_id = 'sede-1795151700722' OR branch_id IN (SELECT id FROM branches WHERE is_active = FALSE OR LOWER(name) LIKE '%covaleda%');
          UPDATE orders SET branch_id = 'sede-1' WHERE branch_id = 'sede-1795151700722' OR branch_id IN (SELECT id FROM branches WHERE is_active = FALSE OR LOWER(name) LIKE '%covaleda%');
          DELETE FROM shifts WHERE branch_id = 'sede-1795151700722' OR branch_id IN (SELECT id FROM branches WHERE is_active = FALSE OR LOWER(name) LIKE '%covaleda%');
          DELETE FROM branches WHERE id = 'sede-1795151700722' OR is_active = FALSE OR LOWER(name) LIKE '%covaleda%';
          UPDATE users SET role_id = 'CUSTOMER', branch_id = NULL WHERE id LIKE 'cust-%' AND role_id != 'CUSTOMER';
        `);
        console.log('✅ [Database]: Esquema, columnas (phone, default_address), tablas de seguridad y depuración de sedes verificadas/migradas.');
      } catch (err: any) {
        console.error('⚠️ [Database Schema Ensure Warning]:', err.message);
      }
    })();
  }
  return schemaEnsuredPromise;
};

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  if (!pool) {
    throw new Error('DATABASE_URL no está configurada en las variables de entorno.');
  }
  // Ensure schema patches (like missing phone or reset tables) are applied automatically
  await ensureSchema();

  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SQL Query] (${duration}ms):`, text.split('\n')[0].trim());
    }
    return res;
  } catch (error: any) {
    console.error('[SQL Error]:', error.message, 'Query:', text);
    throw error;
  }
};

export const getClient = async () => {
  if (!pool) {
    throw new Error('DATABASE_URL no está configurada.');
  }
  return await pool.connect();
};

export default {
  query,
  getClient,
  isDatabaseConfigured,
};
