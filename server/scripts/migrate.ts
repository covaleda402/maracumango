import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  console.log('====================================================');
  console.log('🥭 MARACUMANGO — EJECUTOR DE MIGRACIONES NEON POSTGRESQL');
  console.log('====================================================');

  if (!databaseUrl) {
    console.error('❌ ERROR: La variable DATABASE_URL no está definida en tu archivo .env');
    console.error('👉 Por favor define DATABASE_URL con tu cadena de conexión de Neon y vuelve a ejecutar:');
    console.error('   npm run db:migrate');
    process.exit(1);
  }

  console.log('🔌 Conectando a Neon PostgreSQL...');

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log('✅ Conexión establecida con éxito.');

    const migrationsDir = path.resolve(__dirname, '../migrations');
    const migrationFiles = ['001_create_schema.sql', '002_seed_initial_data.sql', '003_upgrade_schema.sql'];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Archivo ${file} no encontrado en ${migrationsDir}, saltando.`);
        continue;
      }

      console.log(`\n⏳ Ejecutando migración: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf-8');

      const start = Date.now();
      await client.query(sql);
      const duration = Date.now() - start;

      console.log(`✅ Migración ${file} completada exitosamente en ${duration}ms.`);
    }

    console.log('\n🎉 ¡TODAS LAS TABLAS Y DATOS INICIALES FUERON CREADOS EN NEON CORRECTAMENTE!');
    console.log('Tablas preparadas:');
    console.log(' - roles');
    console.log(' - branches (sedes)');
    console.log(' - shifts (turnos)');
    console.log(' - users (admins & workers)');
    console.log(' - categories');
    console.log(' - ingredients');
    console.log(' - products');
    console.log(' - product_ingredients');
    console.log(' - order_statuses');
    console.log(' - orders');
    console.log(' - order_items');
    console.log(' - business_settings');
  } catch (err: any) {
    console.error('\n❌ ERROR durante la ejecución de las migraciones:');
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
