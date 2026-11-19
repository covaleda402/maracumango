-- ====================================================================
-- MARACUMANGO — MIGRATION 004: CUSTOMER AUTH, TERMS COMPLIANCE & BRANCHES
-- Target Engine: Neon PostgreSQL (15+)
-- ====================================================================

-- 1. INSERT CUSTOMER ROLE
INSERT INTO roles (id, name, description) VALUES
  ('CUSTOMER', 'Cliente', 'Cliente registrado de la tienda con acceso al carrito, pedidos y seguimiento en tiempo real')
ON CONFLICT (id) DO NOTHING;

-- 2. ENHANCE USERS TABLE WITH CUSTOMER PROFILE & TERMS ACCEPTANCE (HABEAS DATA)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. LINK ORDERS TO REGISTERED CUSTOMERS
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(150);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_role_email ON users(role_id, email);
