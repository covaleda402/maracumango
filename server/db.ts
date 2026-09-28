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

export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> => {
  if (!pool) {
    throw new Error('DATABASE_URL no está configurada en las variables de entorno.');
  }
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
