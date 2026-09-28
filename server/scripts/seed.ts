import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const databaseUrl = process.env.DATABASE_URL;

  console.log('====================================================');
  console.log('🥭 MARACUMANGO — EJECUTOR DE SEED PARA NEON');
  console.log('====================================================');

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL no está configurada.');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a Neon PostgreSQL...');

    const seedFilePath = path.resolve(__dirname, '../migrations/002_seed_initial_data.sql');
    const sql = fs.readFileSync(seedFilePath, 'utf-8');

    await client.query(sql);
    console.log('✅ Seed ejecutado con éxito.');
  } catch (err: any) {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
