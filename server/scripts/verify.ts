import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

async function verify() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
  );
  console.log('TABLAS_CREADAS:', tables.rows.map((r) => r.table_name));

  const prods = await client.query('SELECT COUNT(*) FROM products;');
  const ings = await client.query('SELECT COUNT(*) FROM ingredients;');
  const sedes = await client.query('SELECT COUNT(*) FROM branches;');
  const users = await client.query('SELECT COUNT(*) FROM users;');
  const roles = await client.query('SELECT COUNT(*) FROM roles;');
  const statuses = await client.query('SELECT COUNT(*) FROM order_statuses;');

  console.log('DATOS_INICIALES:', {
    productos: prods.rows[0].count,
    ingredientes: ings.rows[0].count,
    sedes: sedes.rows[0].count,
    usuarios: users.rows[0].count,
    roles: roles.rows[0].count,
    estados_pedido: statuses.rows[0].count,
  });

  await client.end();
}

verify();
