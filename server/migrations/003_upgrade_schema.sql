-- ====================================================================
-- MARACUMANGO — MIGRATION 003: SCHEMA UPGRADES FOR PERSISTENCE & AUDIT
-- Target Engine: Neon PostgreSQL (15+)
-- ====================================================================

-- 1. Support long base64 image data and flexible external URLs
ALTER TABLE products ALTER COLUMN image_url TYPE TEXT;
ALTER TABLE business_settings ALTER COLUMN logo_url TYPE TEXT;

-- 2. Add preparation tracking columns for worker order taking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_by_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prepared_at TIMESTAMPTZ;

-- 3. Add performance index on prepared_by and status
CREATE INDEX IF NOT EXISTS idx_orders_prepared_by ON orders(prepared_by);
CREATE INDEX IF NOT EXISTS idx_orders_status_updated ON orders(status_id, updated_at);
