-- ====================================================================
-- MARACUMANGO — MIGRATION 002: INITIAL SEED DATA
-- Target Engine: Neon PostgreSQL (15+)
-- ====================================================================

-- 1. SEED ROLES
INSERT INTO roles (id, name, description) VALUES
  ('ADMIN', 'Administrador', 'Acceso total a todas las sedes, gestión de productos, trabajadores y configuración'),
  ('WORKER', 'Trabajador', 'Acceso operativo restringido únicamente a su sede asignada y pedidos aprobados')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED BRANCHES (SEDES DE NEIVA)
INSERT INTO branches (id, name, address, city, phone, whatsapp, is_active) VALUES
  ('sede-1', 'Sede Parque del Amor y la Amistad', 'Cra. 7 / Calle 21', 'Neiva, Huila', '3177401873', '3177401873', TRUE),
  ('sede-2', 'Sede Sector Edsbur / Único', 'Cerca al Centro Comercial Único', 'Neiva, Huila', '3219759794', '3219759794', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  whatsapp = EXCLUDED.whatsapp;

-- 3. SEED SHIFTS (TURNOS)
INSERT INTO shifts (id, branch_id, name, start_time, end_time, description, is_active) VALUES
  ('shift-1', 'sede-1', 'Turno 1', '07:30:00', '14:30:00', 'Turno Mañana: 7:30 a.m. – 2:30 p.m.', TRUE),
  ('shift-2', 'sede-1', 'Turno 2', '14:30:00', '23:00:00', 'Turno Tarde/Noche: 2:30 p.m. – 11:00 p.m.', TRUE),
  ('shift-3', 'sede-2', 'Jornada Continua', '10:00:00', '22:00:00', 'Jornada Continua: 10:00 a.m. – 10:00 p.m.', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time;

-- 4. SEED USERS (Bcrypt hash: 'admin123' / 'worker123')
INSERT INTO users (id, first_name, last_name, email, password_hash, role_id, branch_id, is_active) VALUES
  ('user-admin-1', 'Administrador', 'Principal', 'admin@maracumango.com', '$2b$10$bYTztcltPrdA0OnOR5IpoOsfg7PGijYm4.Wc9bOg4qkJ9C/D1etAS', 'ADMIN', NULL, TRUE),
  ('user-worker-1', 'Carlos', 'Trabajador', 'carlos@maracumango.com', '$2b$10$r9lq6Wb79hT9V4s9c1s8Q.5a0lIe5U/eWJbFhWf1uC.wL8vNlJz6y', 'WORKER', 'sede-1', TRUE),
  ('user-worker-2', 'Laura', 'Trabajadora', 'laura@maracumango.com', '$2b$10$r9lq6Wb79hT9V4s9c1s8Q.5a0lIe5U/eWJbFhWf1uC.wL8vNlJz6y', 'WORKER', 'sede-2', TRUE)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 5. SEED CATEGORIES
INSERT INTO categories (id, name, description, sort_order, is_active) VALUES
  ('cat-1', 'Granizados', 'Granizados artesanales a base de pulpa 100% natural', 1, TRUE),
  ('cat-2', 'Micheladas', 'Cervezas escarchadas con frutas y toques especiales', 2, TRUE),
  ('cat-3', 'Helados', 'Copas de helado y gelato artesanal tropical', 3, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 6. SEED INGREDIENTS
INSERT INTO ingredients (id, name, description, is_active) VALUES
  ('ing-1', 'Hielo frapeado', 'Hielo triturado fino estilo nieve', TRUE),
  ('ing-2', 'Pulpa de maracuyá', 'Pulpa 100% natural ácida y fresca', TRUE),
  ('ing-3', 'Pulpa de mango biche', 'Mango verde huilense seleccionado', TRUE),
  ('ing-4', 'Escarchado de tajín', 'Chile en polvo con toque cítrico', TRUE),
  ('ing-5', 'Leche condensada', 'Toque dulce cremoso', TRUE),
  ('ing-6', 'Gomitas tricolores', 'Topping divertido masticable', TRUE),
  ('ing-7', 'Zumo de limón fresco', 'Limón criollo recién exprimido', TRUE),
  ('ing-8', 'Sal marina', 'Sal en grano para escarchar', TRUE),
  ('ing-9', 'Chamoy artesanal', 'Salsa agridulce casera', TRUE),
  ('ing-10', 'Sirope de la casa', 'Almíbar artesanal ligero', TRUE),
  ('ing-11', 'Cerveza helada', 'Cerveza rubia seleccionada', TRUE),
  ('ing-12', 'Cerveza nacional fría', 'Cerveza tradicional de barril/botella', TRUE),
  ('ing-13', 'Mezcla secreta de especias', 'Mix picante huilense de la casa', TRUE),
  ('ing-14', 'Gelato artesanal mango-maracuyá', 'Base de helado italiano con pulpa local', TRUE),
  ('ing-15', 'Salsa concentrada de maracuyá', 'Reducción de maracuyá con semillas crujientes', TRUE),
  ('ing-16', 'Trozos de mango fresco', 'Cubitos de fruta fresca natural', TRUE),
  ('ing-17', 'Barquillo crocante', 'Galleta barquillo tradicional', TRUE),
  ('ing-18', 'Helado suave de maracuyá', 'Helado suave cremoso para copa', TRUE)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 7. SEED PRODUCTS
INSERT INTO products (id, category_id, name, description, price, image_url, is_popular, is_active) VALUES
  ('prod-1', 'cat-1', 'Granizado Maracumango Especial', 'Nuestra combinación estrella de maracuyá ácido y mango biche con escarchado de tajín, leche condensada y gomitas.', 14000.00, '/images/granizado.png', TRUE, TRUE),
  ('prod-2', 'cat-1', 'Granizado Mango Biche Supremo', 'Hielo frapeado con pulpa 100% natural de mango biche huilense, limón fresco, sal marina y chamoy artesanal.', 12000.00, '/images/granizado.png', TRUE, TRUE),
  ('prod-3', 'cat-1', 'Granizado Maracuyá Silvestre', 'Refrescante granizado de pulpa con semillas crujientes de maracuyá, sirope de la casa y un toque tropical.', 12500.00, '/images/granizado.png', FALSE, TRUE),
  ('prod-4', 'cat-2', 'Michelada Maracumango Biche', 'Cerveza helada con zumo natural de maracuyá y tiras de mango biche, borde escarchado en chamoy y sal de tajín.', 16000.00, '/images/michelada.png', TRUE, TRUE),
  ('prod-5', 'cat-2', 'Michelada Clásica Huilense', 'Cerveza nacional bien fría con zumo de limón recién exprimido, toque secreto de especias y borde salado.', 14500.00, '/images/michelada.png', FALSE, TRUE),
  ('prod-6', 'cat-3', 'Helado Artesanal Copa Mango-Maracuyá', 'Cremoso gelato artesanal hecho a mano con frutas tropicales locales, salsa concentrada de maracuyá y trozos de mango.', 10000.00, '/images/helado.png', TRUE, TRUE),
  ('prod-7', 'cat-3', 'Helado Maracuyá con Leche Condensada', 'Copa de helado suave de maracuyá bañado en abundante leche condensada y crocante de barquillo.', 9500.00, '/images/helado.png', FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  description = EXCLUDED.description;

-- 8. SEED PRODUCT_INGREDIENTS RELATIONS
INSERT INTO product_ingredients (product_id, ingredient_id, sort_order) VALUES
  ('prod-1', 'ing-1', 1),
  ('prod-1', 'ing-2', 2),
  ('prod-1', 'ing-3', 3),
  ('prod-1', 'ing-4', 4),
  ('prod-1', 'ing-5', 5),
  ('prod-1', 'ing-6', 6),
  ('prod-2', 'ing-1', 1),
  ('prod-2', 'ing-3', 2),
  ('prod-2', 'ing-7', 3),
  ('prod-2', 'ing-8', 4),
  ('prod-2', 'ing-9', 5),
  ('prod-3', 'ing-1', 1),
  ('prod-3', 'ing-2', 2),
  ('prod-3', 'ing-10', 3),
  ('prod-3', 'ing-7', 4),
  ('prod-4', 'ing-11', 1),
  ('prod-4', 'ing-2', 2),
  ('prod-4', 'ing-3', 3),
  ('prod-4', 'ing-9', 4),
  ('prod-4', 'ing-4', 5),
  ('prod-5', 'ing-12', 1),
  ('prod-5', 'ing-7', 2),
  ('prod-5', 'ing-13', 3),
  ('prod-5', 'ing-8', 4),
  ('prod-6', 'ing-14', 1),
  ('prod-6', 'ing-15', 2),
  ('prod-6', 'ing-16', 3),
  ('prod-6', 'ing-17', 4),
  ('prod-7', 'ing-18', 1),
  ('prod-7', 'ing-5', 2),
  ('prod-7', 'ing-17', 3)
ON CONFLICT (product_id, ingredient_id) DO NOTHING;

-- 9. SEED ORDER_STATUSES (Strict flow: PENDING_ADMIN -> ACCEPTED -> PREPARING -> READY -> DELIVERED)
INSERT INTO order_statuses (id, name, label, sort_order, description) VALUES
  ('PENDING_ADMIN', 'Pendiente Admin', 'Pendiente de Aprobación Admin', 1, 'Pedido creado por el cliente, en espera de aprobación administrativa'),
  ('ACCEPTED', 'Aceptado', 'Aceptado por Admin', 2, 'Pedido confirmado y aprobado por administración, disponible para preparación'),
  ('PREPARING', 'En preparación', 'En preparación', 3, 'Los trabajadores en turno están elaborando el pedido en sede'),
  ('READY', 'Listo', 'Listo para entrega', 4, 'Pedido empacado y listo para despacho o recogida'),
  ('DELIVERED', 'Entregado', 'Entregado al cliente', 5, 'Pedido completado y recibido satisfactoriamente'),
  ('CANCELLED', 'Cancelado', 'Cancelado', 6, 'Pedido cancelado por el administrador o cliente')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

-- 10. SEED BUSINESS SETTINGS
INSERT INTO business_settings (id, business_name, logo_url, main_address, city, general_whatsapp, shift_info) VALUES
  ('default', 'Maracumango', '/logo-maracumango.png', 'Cra. 7 / Calle 21, Parque del Amor y la Amistad', 'Neiva, Huila', '3177401873', 'Turno 1: 7:30 a.m. – 2:30 p.m. | Turno 2: 2:30 p.m. – 11:00 p.m.')
ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  logo_url = EXCLUDED.logo_url;
