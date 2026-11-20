// server/index.ts
import express from "express";
import cors from "cors";
import dotenv2 from "dotenv";

// server/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
var connectionString = process.env.DATABASE_URL;
var pool = null;
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 3e4,
    connectionTimeoutMillis: 3e4
  });
  pool.on("error", (err) => {
    console.error("\u26A0\uFE0F [Neon PostgreSQL Pool Error]:", err.message);
  });
} else {
  console.warn("\u26A0\uFE0F [Database]: DATABASE_URL no configurada en .env. El backend operar\xE1 en modo informativo/fallback.");
}
var isDatabaseConfigured = () => {
  return pool !== null;
};
var schemaEnsuredPromise = null;
var ensureSchema = async () => {
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
          CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
          CREATE INDEX IF NOT EXISTS idx_reset_email_code ON password_reset_tokens(email, code);

          -- 7. Self-healing cleanup: Purge deleted/covaleda branches and fix customer roles
          UPDATE users SET branch_id = 'sede-1' WHERE branch_id = 'sede-1795151700722' OR branch_id IN (SELECT id FROM branches WHERE is_active = FALSE OR LOWER(name) LIKE '%covaleda%');
          UPDATE orders SET branch_id = 'sede-1' WHERE branch_id = 'sede-1795151700722' OR branch_id IN (SELECT id FROM branches WHERE is_active = FALSE OR LOWER(name) LIKE '%covaleda%');
          DELETE FROM shifts WHERE branch_id = 'sede-1795151700722' OR branch_id IN (SELECT id FROM branches WHERE is_active = FALSE OR LOWER(name) LIKE '%covaleda%');
          DELETE FROM branches WHERE id = 'sede-1795151700722' OR is_active = FALSE OR LOWER(name) LIKE '%covaleda%';
          UPDATE users SET role_id = 'CUSTOMER', branch_id = NULL WHERE id LIKE 'cust-%' AND role_id != 'CUSTOMER';
        `);
        console.log("\u2705 [Database]: Esquema, columnas (phone, default_address), tablas de seguridad y depuraci\xF3n de sedes verificadas/migradas.");
      } catch (err) {
        console.error("\u26A0\uFE0F [Database Schema Ensure Warning]:", err.message);
      }
    })();
  }
  return schemaEnsuredPromise;
};
var query = async (text, params) => {
  if (!pool) {
    throw new Error("DATABASE_URL no est\xE1 configurada en las variables de entorno.");
  }
  await ensureSchema();
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "development") {
      console.log(`[SQL Query] (${duration}ms):`, text.split("\n")[0].trim());
    }
    return res;
  } catch (error) {
    console.error("[SQL Error]:", error.message, "Query:", text);
    throw error;
  }
};
var getClient = async () => {
  if (!pool) {
    throw new Error("DATABASE_URL no est\xE1 configurada.");
  }
  return await pool.connect();
};

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "maracumango_super_secret_jwt_key_2026_prod";
var authenticate = (req, _res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        id: decoded.id,
        firstName: decoded.firstName || decoded.name || "Usuario",
        lastName: decoded.lastName,
        email: decoded.email,
        role: decoded.role,
        branchId: decoded.branchId,
        phone: decoded.phone,
        defaultAddress: decoded.defaultAddress,
        acceptedTerms: decoded.acceptedTerms
      };
      return next();
    } catch {
    }
  }
  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_HEADER_AUTH === "true") {
    const roleHeader = req.headers["x-user-role"]?.toUpperCase();
    const branchHeader = req.headers["x-branch-id"];
    const userIdHeader = req.headers["x-user-id"];
    if (roleHeader === "ADMIN" || roleHeader === "WORKER") {
      req.user = {
        id: userIdHeader || (roleHeader === "ADMIN" ? "user-admin-1" : "user-worker-1"),
        firstName: roleHeader === "ADMIN" ? "Admin" : "Trabajador",
        email: roleHeader === "ADMIN" ? "admin@maracumango.com" : "trabajador@maracumango.com",
        role: roleHeader,
        branchId: branchHeader || (roleHeader === "WORKER" ? "sede-1" : null)
      };
    }
  }
  next();
};
var requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "ADMIN") {
    res.status(403).json({
      error: "Acceso denegado. Se requieren permisos de Administrador para realizar esta acci\xF3n."
    });
    return;
  }
  next();
};
var requireWorkerOrAdmin = (req, res, next) => {
  const user = req.user;
  if (!user || user.role !== "ADMIN" && user.role !== "WORKER") {
    res.status(403).json({
      error: "Acceso denegado. Se requiere autenticaci\xF3n de personal autorizado (Admin o Trabajador)."
    });
    return;
  }
  next();
};

// server/routes/branches.ts
import { Router } from "express";

// src/data/sedes.ts
var SEDES = [
  {
    id: "sede-1",
    nombre: "Sede Parque del Amor y la Amistad",
    direccion: "Cra. 7 / Calle 21",
    ciudad: "Neiva, Huila",
    whatsapp: "3177401873",
    horario: "Turno 1: 7:30 a.m. \u2013 2:30 p.m. | Turno 2: 2:30 p.m. \u2013 11:00 p.m.",
    shiftInfo: "Turno Activo: Turno 2 (2:30 p.m. \u2013 11:00 p.m.)",
    activa: true
  },
  {
    id: "sede-2",
    nombre: "Sede Sector Edsbur / \xDAnico",
    direccion: "Cerca al Centro Comercial \xDAnico",
    ciudad: "Neiva, Huila",
    whatsapp: "3219759794",
    horario: "Jornada Continua: 10:00 a.m. \u2013 10:00 p.m.",
    shiftInfo: "Turno Activo: Jornada Continua (10:00 a.m. \u2013 10:00 p.m.)",
    activa: true
  }
];

// server/routes/branches.ts
var router = Router();
var devFallbackBranches = [...SEDES];
router.get("/", async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.json(devFallbackBranches);
  }
  try {
    const branchesResult = await query(
      `SELECT b.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'startTime', s.start_time,
              'endTime', s.end_time,
              'description', s.description,
              'isActive', s.is_active
            ) ORDER BY s.start_time
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS shifts
       FROM branches b
       LEFT JOIN shifts s ON s.branch_id = b.id AND s.is_active = TRUE
       WHERE b.is_active = TRUE AND LOWER(b.name) NOT LIKE '%covaleda%' AND b.id != 'sede-1795151700722'
       GROUP BY b.id
       ORDER BY b.id ASC`
    );
    const formatted = branchesResult.rows.map((row) => ({
      id: row.id,
      nombre: row.name,
      direccion: row.address,
      ciudad: row.city,
      whatsapp: row.whatsapp,
      phone: row.phone || row.whatsapp,
      activa: row.is_active,
      shifts: row.shifts,
      horario: row.shifts && row.shifts.length > 0 ? row.shifts.map((s) => `${s.name}: ${String(s.startTime).slice(0, 5)} \u2013 ${String(s.endTime).slice(0, 5)}`).join(" | ") : "Horario comercial",
      shiftInfo: row.shifts && row.shifts.length > 0 ? `Turno Activo: ${row.shifts[0].name} (${String(row.shifts[0].startTime).slice(0, 5)} \u2013 ${String(row.shifts[0].endTime).slice(0, 5)})` : "Turno activo"
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Error fetching branches from DB:", error.message);
    res.json(SEDES);
  }
});
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseConfigured()) {
    const found = devFallbackBranches.find((s) => s.id === id);
    return found ? res.json(found) : res.status(404).json({ error: "Sede no encontrada" });
  }
  try {
    const result = await query(
      `SELECT b.*, 
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name,
              'startTime', s.start_time,
              'endTime', s.end_time,
              'description', s.description,
              'isActive', s.is_active
            ) ORDER BY s.start_time
          ) FILTER (WHERE s.id IS NOT NULL), '[]'
        ) AS shifts
       FROM branches b
       LEFT JOIN shifts s ON s.branch_id = b.id AND s.is_active = TRUE
       WHERE b.id = $1
       GROUP BY b.id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }
    const b = result.rows[0];
    res.json({
      id: b.id,
      nombre: b.name,
      direccion: b.address,
      ciudad: b.city,
      whatsapp: b.whatsapp,
      phone: b.phone || b.whatsapp,
      activa: b.is_active,
      horario: b.shifts && b.shifts.length > 0 ? b.shifts.map((s) => `${s.name}: ${String(s.startTime).slice(0, 5)} \u2013 ${String(s.endTime).slice(0, 5)}`).join(" | ") : "Horario comercial",
      shiftInfo: b.shifts && b.shifts.length > 0 ? `Turno Activo: ${b.shifts[0].name} (${String(b.shifts[0].startTime).slice(0, 5)} \u2013 ${String(b.shifts[0].endTime).slice(0, 5)})` : "Turno activo"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, direccion, ciudad, whatsapp, phone, activa } = req.body;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackBranches.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }
    devFallbackBranches[idx] = {
      ...devFallbackBranches[idx],
      ...nombre !== void 0 && { nombre: String(nombre).trim() },
      ...direccion !== void 0 && { direccion: String(direccion).trim() },
      ...ciudad !== void 0 && { ciudad: String(ciudad).trim() },
      ...whatsapp !== void 0 && { whatsapp: String(whatsapp).trim() },
      ...phone !== void 0 && { phone: String(phone).trim() },
      ...activa !== void 0 && { activa: !!activa }
    };
    return res.json({
      ...devFallbackBranches[idx],
      message: "Sede actualizada exitosamente (Modo local)."
    });
  }
  try {
    const cleanNombre = nombre !== void 0 ? String(nombre).trim() : null;
    const cleanDireccion = direccion !== void 0 ? String(direccion).trim() : null;
    const cleanCiudad = ciudad !== void 0 ? String(ciudad).trim() : null;
    const cleanWhatsapp = whatsapp !== void 0 ? String(whatsapp).trim() : null;
    const cleanPhone = phone !== void 0 ? String(phone).trim() : cleanWhatsapp;
    const cleanActiva = activa !== void 0 ? !!activa : null;
    const result = await query(
      `UPDATE branches
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           city = COALESCE($3, city),
           whatsapp = COALESCE($4, whatsapp),
           phone = COALESCE($5, phone),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [cleanNombre, cleanDireccion, cleanCiudad, cleanWhatsapp, cleanPhone, cleanActiva, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sede no encontrada" });
    }
    const updated = result.rows[0];
    res.json({
      id: updated.id,
      nombre: updated.name,
      direccion: updated.address,
      ciudad: updated.city,
      whatsapp: updated.whatsapp,
      phone: updated.phone || updated.whatsapp,
      activa: updated.is_active,
      message: "Sede actualizada exitosamente en base de datos."
    });
  } catch (error) {
    console.error("Error updating branch in DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router.post("/", requireAdmin, async (req, res) => {
  const { nombre, direccion, ciudad, whatsapp, phone, horario } = req.body;
  if (!nombre || !direccion || !whatsapp) {
    return res.status(400).json({ error: "Nombre, direcci\xF3n y WhatsApp son obligatorios para crear una sede." });
  }
  const cleanNombre = String(nombre).trim();
  const cleanDireccion = String(direccion).trim();
  const cleanCiudad = ciudad ? String(ciudad).trim() : "Neiva, Huila";
  const cleanWhatsapp = String(whatsapp).trim();
  const cleanPhone = phone ? String(phone).trim() : cleanWhatsapp;
  const cleanHorario = horario ? String(horario).trim() : "Jornada Continua: 9:00 a.m. \u2013 9:00 p.m.";
  const branchId = `sede-${Date.now()}`;
  if (!isDatabaseConfigured()) {
    const newSedeFallback = {
      id: branchId,
      nombre: cleanNombre,
      direccion: cleanDireccion,
      ciudad: cleanCiudad,
      whatsapp: cleanWhatsapp,
      phone: cleanPhone,
      horario: cleanHorario,
      shiftInfo: `Turno Activo: ${cleanHorario}`,
      activa: true,
      shifts: []
    };
    devFallbackBranches.push(newSedeFallback);
    return res.status(201).json(newSedeFallback);
  }
  try {
    const result = await query(
      `INSERT INTO branches (id, name, address, city, phone, whatsapp, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [branchId, cleanNombre, cleanDireccion, cleanCiudad, cleanPhone, cleanWhatsapp]
    );
    const b = result.rows[0];
    const shiftId = `shift-${Date.now()}`;
    await query(
      `INSERT INTO shifts (id, branch_id, name, start_time, end_time, description, is_active)
       VALUES ($1, $2, $3, '09:00:00', '21:00:00', $4, TRUE)`,
      [shiftId, branchId, "Jornada Comercial", cleanHorario]
    );
    res.status(201).json({
      id: b.id,
      nombre: b.name,
      direccion: b.address,
      ciudad: b.city,
      whatsapp: b.whatsapp,
      phone: b.phone || b.whatsapp,
      horario: cleanHorario,
      shiftInfo: `Turno Activo: ${cleanHorario}`,
      activa: b.is_active,
      shifts: [
        {
          id: shiftId,
          name: "Jornada Comercial",
          startTime: "09:00:00",
          endTime: "21:00:00",
          description: cleanHorario,
          isActive: true
        }
      ],
      message: "Sede creada exitosamente."
    });
  } catch (error) {
    console.error("Error creating branch in DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackBranches.findIndex((s) => s.id === id);
    if (idx !== -1) {
      devFallbackBranches.splice(idx, 1);
    }
    return res.json({ message: "Sede eliminada permanentemente del sistema.", success: true, deleted: true });
  }
  try {
    await query("UPDATE users SET branch_id = 'sede-1' WHERE branch_id = $1", [id]);
    await query("UPDATE orders SET branch_id = 'sede-1' WHERE branch_id = $1", [id]);
    await query("DELETE FROM shifts WHERE branch_id = $1", [id]);
    const result = await query("DELETE FROM branches WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sede no encontrada." });
    }
    res.json({ message: "Sede eliminada permanentemente del sistema.", success: true, deleted: true });
  } catch (error) {
    console.error("Error deleting branch:", error.message);
    res.status(500).json({ error: error.message });
  }
});
var branches_default = router;

// server/routes/categories.ts
import { Router as Router2 } from "express";

// src/data/mockData.ts
var PRODUCT_INGREDIENTS = {
  "prod-1": ["Hielo frapeado", "Pulpa de maracuy\xE1", "Pulpa de mango biche", "Escarchado de taj\xEDn", "Leche condensada", "Gomitas tricolores"],
  "prod-2": ["Hielo frapeado", "Pulpa natural de mango biche", "Zumo de lim\xF3n fresco", "Sal marina", "Chamoy artesanal"],
  "prod-3": ["Hielo frapeado", "Pulpa con semillas de maracuy\xE1", "Sirope de la casa", "Toque tropical de lim\xF3n"],
  "prod-4": ["Cerveza helada", "Zumo natural de maracuy\xE1", "Tiras de mango biche", "Borde escarchado chamoy + taj\xEDn"],
  "prod-5": ["Cerveza nacional fr\xEDa", "Zumo de lim\xF3n reci\xE9n exprimido", "Mezcla secreta de especias", "Borde con sal marina"],
  "prod-6": ["Gelato artesanal mango-maracuy\xE1", "Salsa concentrada de maracuy\xE1", "Trozos de mango fresco", "Barquillo"],
  "prod-7": ["Helado suave de maracuy\xE1", "Leche condensada abundante", "Crocante de barquillo"]
};
var INITIAL_PRODUCTS = [
  {
    id: "prod-1",
    name: "Granizado Maracumango Especial",
    category: "Granizados",
    price: 14e3,
    description: "Nuestra combinaci\xF3n estrella de maracuy\xE1 \xE1cido y mango biche con escarchado de taj\xEDn, leche condensada y gomitas.",
    image: "/images/granizado.png",
    active: true,
    popular: true
  },
  {
    id: "prod-2",
    name: "Granizado Mango Biche Supremo",
    category: "Granizados",
    price: 12e3,
    description: "Hielo frapeado con pulpa 100% natural de mango biche huilense, lim\xF3n fresco, sal marina y chamoy artesanal.",
    image: "/images/granizado.png",
    active: true,
    popular: true
  },
  {
    id: "prod-3",
    name: "Granizado Maracuy\xE1 Silvestre",
    category: "Granizados",
    price: 12500,
    description: "Refrescante granizado de pulpa con semillas crujientes de maracuy\xE1, sirope de la casa y un toque tropical.",
    image: "/images/granizado.png",
    active: true
  },
  {
    id: "prod-4",
    name: "Michelada Maracumango Biche",
    category: "Micheladas",
    price: 16e3,
    description: "Cerveza helada con zumo natural de maracuy\xE1 y tiras de mango biche, borde escarchado en chamoy y sal de taj\xEDn.",
    image: "/images/michelada.png",
    active: true,
    popular: true
  },
  {
    id: "prod-5",
    name: "Michelada Cl\xE1sica Huilense",
    category: "Micheladas",
    price: 14500,
    description: "Cerveza nacional bien fr\xEDa con zumo de lim\xF3n reci\xE9n exprimido, toque secreto de especias y borde salado.",
    image: "/images/michelada.png",
    active: true
  },
  {
    id: "prod-6",
    name: "Helado Artesanal Copa Mango-Maracuy\xE1",
    category: "Helados",
    price: 1e4,
    description: "Cremoso gelato artesanal hecho a mano con frutas tropicales locales, salsa concentrada de maracuy\xE1 y trozos de mango.",
    image: "/images/helado.png",
    active: true,
    popular: true
  },
  {
    id: "prod-7",
    name: "Helado Maracuy\xE1 con Leche Condensada",
    category: "Helados",
    price: 9500,
    description: "Copa de helado suave de maracuy\xE1 ba\xF1ado en abundante leche condensada y crocante de barquillo.",
    image: "/images/helado.png",
    active: true
  }
];
var INITIAL_ORDERS = [
  {
    id: "ord-101",
    orderNumber: "#MMC-101",
    customerName: "Carlos G\xF3mez",
    customerPhone: "3124567890",
    sedeId: "sede-1",
    sedeNombre: "Sede Parque del Amor y la Amistad",
    deliveryMethod: "domicilio",
    deliveryAddress: "Calle 15 # 8-24, Barrio Quirinal",
    paymentMethod: "nequi",
    items: [
      {
        productId: "prod-1",
        productName: "Granizado Maracumango Especial",
        unitPrice: 14e3,
        quantity: 2,
        ingredients: ["Hielo frapeado", "Pulpa de maracuy\xE1", "Pulpa de mango biche", "Escarchado de taj\xEDn", "Leche condensada", "Gomitas tricolores"],
        notes: "Poco taj\xEDn"
      }
    ],
    subtotal: 28e3,
    deliveryFee: 3e3,
    total: 31e3,
    status: "En preparaci\xF3n",
    createdAt: new Date(Date.now() - 15 * 6e4).toISOString(),
    notes: "Poco taj\xEDn por favor."
  },
  {
    id: "ord-102",
    orderNumber: "#MMC-102",
    customerName: "Mariana Rojas",
    customerPhone: "3189876543",
    sedeId: "sede-1",
    sedeNombre: "Sede Parque del Amor y la Amistad",
    deliveryMethod: "recoger",
    paymentMethod: "nequi",
    items: [
      {
        productId: "prod-4",
        productName: "Michelada Maracumango Biche",
        unitPrice: 16e3,
        quantity: 1,
        ingredients: ["Cerveza helada", "Zumo natural de maracuy\xE1", "Tiras de mango biche", "Borde escarchado chamoy + taj\xEDn"]
      },
      {
        productId: "prod-6",
        productName: "Helado Artesanal Copa Mango-Maracuy\xE1",
        unitPrice: 1e4,
        quantity: 1,
        ingredients: ["Gelato artesanal mango-maracuy\xE1", "Salsa concentrada de maracuy\xE1", "Trozos de mango fresco", "Barquillo"]
      }
    ],
    subtotal: 26e3,
    deliveryFee: 0,
    total: 26e3,
    status: "Pendiente",
    createdAt: new Date(Date.now() - 5 * 6e4).toISOString()
  },
  {
    id: "ord-103",
    orderNumber: "#MMC-103",
    customerName: "Andr\xE9s Pastrana",
    customerPhone: "3157778899",
    sedeId: "sede-2",
    sedeNombre: "Sede Sector Edsbur / \xDAnico",
    deliveryMethod: "domicilio",
    deliveryAddress: "Cra. 16 # 21-45, Ipanema",
    paymentMethod: "nequi",
    items: [
      {
        productId: "prod-2",
        productName: "Granizado Mango Biche Supremo",
        unitPrice: 12e3,
        quantity: 3,
        ingredients: ["Hielo frapeado", "Pulpa natural de mango biche", "Zumo de lim\xF3n fresco", "Sal marina", "Chamoy artesanal"]
      }
    ],
    subtotal: 36e3,
    deliveryFee: 3e3,
    total: 39e3,
    status: "Listo",
    createdAt: new Date(Date.now() - 35 * 6e4).toISOString()
  },
  {
    id: "ord-104",
    orderNumber: "#MMC-104",
    customerName: "Laura Trujillo",
    customerPhone: "3102223344",
    sedeId: "sede-2",
    sedeNombre: "Sede Sector Edsbur / \xDAnico",
    deliveryMethod: "domicilio",
    deliveryAddress: "Calle 26 # 5-12, Centro",
    paymentMethod: "efectivo",
    items: [
      {
        productId: "prod-6",
        productName: "Helado Artesanal Copa Mango-Maracuy\xE1",
        unitPrice: 1e4,
        quantity: 2,
        ingredients: ["Gelato artesanal mango-maracuy\xE1", "Salsa concentrada de maracuy\xE1", "Trozos de mango fresco", "Barquillo"]
      }
    ],
    subtotal: 2e4,
    deliveryFee: 3e3,
    total: 23e3,
    status: "Entregado",
    createdAt: new Date(Date.now() - 90 * 6e4).toISOString()
  }
];
var DEFAULT_BUSINESS_CONFIG = {
  whatsappNumber: "3177401873",
  sede1Whatsapp: "3177401873",
  sede2Whatsapp: "3219759794",
  defaultDeliveryFee: 3e3,
  businessName: "Maracumango",
  mainAddress: "Cra. 7 / Calle 21, Parque del Amor y la Amistad",
  city: "Neiva, Huila",
  shiftInfo: "Turno 1: 7:30 a.m. \u2013 2:30 p.m. | Turno 2: 2:30 p.m. \u2013 11:00 p.m."
};

// src/services/storageService.ts
var INITIAL_CATEGORIES = [
  { id: "cat-1", name: "Granizados", description: "Granizados artesanales a base de pulpa 100% natural", active: true, order: 1 },
  { id: "cat-2", name: "Micheladas", description: "Cervezas escarchadas con frutas y toques especiales", active: true, order: 2 },
  { id: "cat-3", name: "Helados", description: "Copas de helado y gelato artesanal tropical", active: true, order: 3 }
];

// server/routes/categories.ts
var router2 = Router2();
var devFallbackCategories = [...INITIAL_CATEGORIES];
var formatCategory = (c) => ({
  id: c.id,
  name: c.name,
  description: c.description || "",
  order: c.sort_order ?? c.order ?? 0,
  active: c.is_active ?? c.active ?? true
});
router2.get("/", async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  if (!isDatabaseConfigured()) {
    return res.json(activeOnly ? devFallbackCategories.filter((c) => c.active) : devFallbackCategories);
  }
  try {
    const whereClause = activeOnly ? "WHERE is_active = TRUE" : "";
    const result = await query(
      `SELECT id, name, description, sort_order, is_active 
       FROM categories 
       ${whereClause}
       ORDER BY sort_order ASC, name ASC`
    );
    res.json(result.rows.map(formatCategory));
  } catch (error) {
    console.error("Error fetching categories from DB:", error.message);
    res.json(activeOnly ? INITIAL_CATEGORIES.filter((c) => c.active) : INITIAL_CATEGORIES);
  }
});
router2.post("/", requireAdmin, async (req, res) => {
  const { name, description, order } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "El nombre de la categor\xEDa es obligatorio." });
  }
  if (!isDatabaseConfigured()) {
    const newCat = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      description: description ? description.trim() : "",
      order: order || 0,
      active: true
    };
    devFallbackCategories.push(newCat);
    return res.status(201).json(newCat);
  }
  try {
    const id = `cat-${Date.now()}`;
    const cleanName = name.trim();
    const result = await query(
      `INSERT INTO categories (id, name, description, sort_order, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       ON CONFLICT (name) DO UPDATE SET is_active = TRUE, description = EXCLUDED.description
       RETURNING *`,
      [id, cleanName, description ? description.trim() : null, order || 0]
    );
    res.status(201).json(formatCategory(result.rows[0]));
  } catch (error) {
    console.error("Error creating category in DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router2.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, order, active } = req.body;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackCategories.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Categor\xEDa no encontrada." });
    }
    devFallbackCategories[idx] = {
      ...devFallbackCategories[idx],
      ...name !== void 0 && { name: String(name).trim() },
      ...description !== void 0 && { description: String(description).trim() },
      ...order !== void 0 && { order: Number(order) },
      ...active !== void 0 && { active: !!active }
    };
    return res.json(devFallbackCategories[idx]);
  }
  try {
    const cleanName = name !== void 0 && name !== null ? String(name).trim() : null;
    const cleanDesc = description !== void 0 && description !== null ? String(description).trim() : null;
    const cleanOrder = order !== void 0 && order !== null ? Number(order) : null;
    const cleanActive = active !== void 0 && active !== null ? !!active : null;
    const result = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           sort_order = COALESCE($3, sort_order),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [cleanName, cleanDesc, cleanOrder, cleanActive, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Categor\xEDa no encontrada." });
    }
    res.json(formatCategory(result.rows[0]));
  } catch (error) {
    console.error("Error updating category in DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router2.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackCategories.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Categor\xEDa no encontrada." });
    }
    const catName = devFallbackCategories[idx].name;
    devFallbackCategories.splice(idx, 1);
    return res.json({ message: `Categor\xEDa "${catName}" eliminada exitosamente.` });
  }
  try {
    const catCheck = await query("SELECT id, name FROM categories WHERE id = $1", [id]);
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ error: "Categor\xEDa no encontrada." });
    }
    const catName = catCheck.rows[0].name;
    const prodCountRes = await query(
      "SELECT count(*) FROM products WHERE category_id = $1",
      [id]
    );
    const prodCount = parseInt(prodCountRes.rows[0].count, 10);
    if (prodCount > 0) {
      return res.status(400).json({
        error: `No es posible eliminar la categor\xEDa "${catName}" porque tiene ${prodCount} producto(s) asociado(s). Reasigna o elimina los productos primero para mantener la integridad del cat\xE1logo.`
      });
    }
    await query("DELETE FROM categories WHERE id = $1", [id]);
    res.json({ message: `Categor\xEDa "${catName}" eliminada exitosamente.` });
  } catch (error) {
    console.error("Error deleting category from DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
var categories_default = router2;

// server/routes/ingredients.ts
import { Router as Router3 } from "express";
var router3 = Router3();
router3.get("/", async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.json([
      { id: "ing-1", name: "Hielo frapeado", active: true },
      { id: "ing-2", name: "Pulpa de maracuy\xE1", active: true },
      { id: "ing-3", name: "Pulpa de mango biche", active: true },
      { id: "ing-4", name: "Escarchado de taj\xEDn", active: true },
      { id: "ing-5", name: "Leche condensada", active: true },
      { id: "ing-6", name: "Gomitas tricolores", active: true },
      { id: "ing-7", name: "Zumo de lim\xF3n fresco", active: true },
      { id: "ing-8", name: "Sal marina", active: true },
      { id: "ing-9", name: "Chamoy artesanal", active: true }
    ]);
  }
  try {
    const result = await query(
      "SELECT id, name, description, is_active FROM ingredients WHERE is_active = TRUE ORDER BY name ASC"
    );
    res.json(result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      active: r.is_active
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router3.post("/", requireAdmin, async (req, res) => {
  const { name, description } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "El nombre del ingrediente es obligatorio." });
  }
  if (!isDatabaseConfigured()) {
    return res.status(201).json({ id: `ing-${Date.now()}`, name: name.trim(), description: description || null, active: true });
  }
  try {
    const id = `ing-${Date.now()}`;
    const result = await query(
      "INSERT INTO ingredients (id, name, description, is_active) VALUES ($1, $2, $3, TRUE) RETURNING *",
      [id, name.trim(), description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var ingredients_default = router3;

// server/routes/products.ts
import { Router as Router4 } from "express";

// server/middleware/validate.ts
var NO_NUMBERS_REGEX = /^[^0-9]*$/;
var VALID_NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/;
var VALID_PHONE_REGEX = /^[0-9+\s()-]{7,20}$/;
var CONTAINS_LETTERS_REGEX = /[a-zA-Z]/;
var VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var validateCustomerOrder = (req, res, next) => {
  let { customerName, customerPhone, notes, items, deliveryMethod, deliveryAddress } = req.body;
  if ((!customerName || !String(customerName).trim()) && req.user) {
    customerName = req.user.name || `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || req.user.firstName;
    req.body.customerName = customerName;
  }
  if ((!customerPhone || !String(customerPhone).trim()) && req.user?.phone) {
    customerPhone = req.user.phone;
    req.body.customerPhone = customerPhone;
  }
  if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
    res.status(400).json({ error: "El nombre del cliente es obligatorio." });
    return;
  }
  if (!VALID_NAME_REGEX.test(customerName.trim()) || !NO_NUMBERS_REGEX.test(customerName.trim())) {
    res.status(400).json({
      error: "El nombre del cliente no puede contener n\xFAmeros ni caracteres inv\xE1lidos."
    });
    return;
  }
  if (!customerPhone || typeof customerPhone !== "string" || !customerPhone.trim()) {
    res.status(400).json({ error: "El tel\xE9fono del cliente es obligatorio." });
    return;
  }
  if (CONTAINS_LETTERS_REGEX.test(customerPhone) || !VALID_PHONE_REGEX.test(customerPhone.trim())) {
    res.status(400).json({
      error: "El tel\xE9fono no puede contener letras y debe ser un n\xFAmero v\xE1lido."
    });
    return;
  }
  if (notes && typeof notes === "string" && notes.length > 500) {
    res.status(400).json({
      error: "Las indicaciones del pedido no pueden exceder los 500 caracteres."
    });
    return;
  }
  if (!deliveryMethod || !["domicilio", "recoger"].includes(deliveryMethod)) {
    res.status(400).json({ error: "M\xE9todo de entrega inv\xE1lido (domicilio o recoger)." });
    return;
  }
  if (deliveryMethod === "domicilio" && (!deliveryAddress || !deliveryAddress.trim())) {
    res.status(400).json({ error: "La direcci\xF3n es obligatoria para pedidos con entrega a domicilio." });
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "El pedido debe incluir al menos un producto." });
    return;
  }
  for (const item of items) {
    if (!item.productId || typeof item.productId !== "string") {
      res.status(400).json({ error: "Cada \xEDtem debe tener un ID de producto v\xE1lido." });
      return;
    }
    if (!item.quantity || typeof item.quantity !== "number" || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      res.status(400).json({ error: "La cantidad de cada producto debe ser un entero positivo." });
      return;
    }
  }
  next();
};
var validateProductInput = (req, res, next) => {
  const { name, categoryId, category, price, imageUrl, image } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "El nombre del producto es obligatorio." });
    return;
  }
  const numPrice = typeof price === "number" ? price : Number(price);
  if (price === void 0 || isNaN(numPrice) || numPrice < 0) {
    res.status(400).json({ error: "El precio debe ser un valor num\xE9rico mayor o igual a cero." });
    return;
  }
  if ((!categoryId || typeof categoryId !== "string") && (!category || typeof category !== "string")) {
    res.status(400).json({ error: "La categor\xEDa es obligatoria." });
    return;
  }
  const img = imageUrl || image;
  if (img && typeof img !== "string") {
    res.status(400).json({ error: "La URL o dato de la imagen debe ser un texto v\xE1lido." });
    return;
  }
  next();
};

// server/routes/products.ts
var router4 = Router4();
var devFallbackProducts = INITIAL_PRODUCTS.map((p) => ({
  ...p,
  ingredients: PRODUCT_INGREDIENTS[p.id] || []
}));
var formatProductRow = (p, categoryName, ingredientsList) => {
  let finalIngs = [];
  if (Array.isArray(ingredientsList)) {
    finalIngs = ingredientsList;
  } else if (Array.isArray(p.ingredients)) {
    finalIngs = p.ingredients;
  } else if (typeof p.ingredients === "string") {
    try {
      const parsed = JSON.parse(p.ingredients);
      finalIngs = Array.isArray(parsed) ? parsed : [];
    } catch {
      finalIngs = [];
    }
  }
  return {
    id: String(p.id),
    name: String(p.name || ""),
    category: categoryName || p.category || "Granizados",
    categoryId: p.category_id || p.categoryId || "cat-1",
    price: typeof p.price === "string" ? parseFloat(p.price) : Number(p.price || 0),
    description: p.description ? String(p.description) : "",
    image: p.image_url || p.image || "/images/granizado.png",
    popular: !!(p.is_popular ?? p.popular),
    active: p.is_active !== void 0 ? !!p.is_active : p.active !== void 0 ? !!p.active : true,
    ingredients: finalIngs
  };
};
router4.get("/", async (req, res) => {
  const activeOnly = req.query.activeOnly === "true";
  if (!isDatabaseConfigured()) {
    return res.json(activeOnly ? devFallbackProducts.filter((p) => p.active) : devFallbackProducts);
  }
  try {
    const whereClause = activeOnly ? "WHERE p.is_active = TRUE" : "";
    const result = await query(
      `SELECT 
        p.id,
        p.name,
        c.name AS category,
        p.category_id AS "categoryId",
        p.price::float AS price,
        p.description,
        p.image_url AS image,
        p.is_popular AS popular,
        p.is_active AS active,
        COALESCE(
          json_agg(i.name ORDER BY pi.sort_order ASC) FILTER (WHERE i.name IS NOT NULL),
          '[]'
        ) AS ingredients
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_ingredients pi ON pi.product_id = p.id
       LEFT JOIN ingredients i ON i.id = pi.ingredient_id AND i.is_active = TRUE
       ${whereClause}
       GROUP BY p.id, c.name
       ORDER BY p.created_at ASC`
    );
    res.json(result.rows.map((row) => formatProductRow(row)));
  } catch (error) {
    console.error("Error fetching products from DB:", error.message);
    const productsWithIngs = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      ingredients: PRODUCT_INGREDIENTS[p.id] || []
    }));
    res.json(activeOnly ? productsWithIngs.filter((p) => p.active) : productsWithIngs);
  }
});
async function resolveCategoryId(client, categoryId, categoryName) {
  if (categoryId) {
    const res = await client.query("SELECT id FROM categories WHERE id = $1", [categoryId]);
    if (res.rows.length > 0) return res.rows[0].id;
  }
  if (categoryName) {
    const res = await client.query(
      "SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR id = $1 LIMIT 1",
      [categoryName]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  }
  const firstCat = await client.query("SELECT id FROM categories ORDER BY sort_order ASC LIMIT 1");
  return firstCat.rows[0]?.id || "cat-1";
}
router4.post("/", requireAdmin, validateProductInput, async (req, res) => {
  const {
    name,
    categoryId,
    category,
    price,
    description,
    imageUrl,
    image,
    isPopular,
    popular,
    isActive,
    active,
    ingredientIds,
    ingredients
  } = req.body;
  if (!isDatabaseConfigured()) {
    const newProd = {
      id: `prod-${Date.now()}`,
      name: name.trim(),
      category: category || "Granizados",
      categoryId: categoryId || "cat-1",
      price: Number(price),
      description: description ? description.trim() : "",
      image: imageUrl || image || "/images/granizado.png",
      popular: !!(isPopular ?? popular),
      active: isActive !== void 0 ? !!isActive : active !== void 0 ? !!active : true,
      ingredients: Array.isArray(ingredients) ? ingredients : []
    };
    devFallbackProducts.push(newProd);
    return res.status(201).json(newProd);
  }
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const resolvedCatId = await resolveCategoryId(client, categoryId, category);
    const finalImage = imageUrl || image || "/images/granizado.png";
    const finalPopular = isPopular !== void 0 ? !!isPopular : popular !== void 0 ? !!popular : false;
    const finalActive = isActive !== void 0 ? !!isActive : active !== void 0 ? !!active : true;
    const productId = `prod-${Date.now()}`;
    const insertResult = await client.query(
      `INSERT INTO products (id, category_id, name, description, price, image_url, is_popular, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        productId,
        resolvedCatId,
        name.trim(),
        description ? description.trim() : null,
        Number(price),
        finalImage,
        finalPopular,
        finalActive
      ]
    );
    const finalIngNames = [];
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ingName = String(ingredients[i]).trim();
        if (!ingName) continue;
        finalIngNames.push(ingName);
        const ingRes = await client.query(
          `INSERT INTO ingredients (id, name, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (name) DO UPDATE SET is_active = TRUE
           RETURNING id`,
          [`ing-${Date.now()}-${i}`, ingName]
        );
        const ingId = ingRes.rows[0].id;
        await client.query(
          `INSERT INTO product_ingredients (product_id, ingredient_id, sort_order)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [productId, ingId, i + 1]
        );
      }
    } else if (Array.isArray(ingredientIds) && ingredientIds.length > 0) {
      for (let i = 0; i < ingredientIds.length; i++) {
        await client.query(
          `INSERT INTO product_ingredients (product_id, ingredient_id, sort_order)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [productId, ingredientIds[i], i + 1]
        );
      }
    }
    const catRes = await client.query("SELECT name FROM categories WHERE id = $1", [resolvedCatId]);
    const catName = catRes.rows[0]?.name || "Categor\xEDa";
    await client.query("COMMIT");
    const created = formatProductRow(insertResult.rows[0], catName, finalIngNames);
    res.status(201).json(created);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating product in DB:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
router4.put("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    categoryId,
    category,
    price,
    description,
    imageUrl,
    image,
    isPopular,
    popular,
    isActive,
    active,
    ingredientIds,
    ingredients
  } = req.body;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackProducts.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Producto no encontrado." });
    devFallbackProducts[idx] = {
      ...devFallbackProducts[idx],
      ...name !== void 0 && { name: String(name).trim() },
      ...price !== void 0 && { price: Number(price) },
      ...description !== void 0 && { description: String(description).trim() },
      ...imageUrl !== void 0 && { image: String(imageUrl) },
      ...image !== void 0 && { image: String(image) },
      ...isPopular !== void 0 && { popular: !!isPopular },
      ...popular !== void 0 && { popular: !!popular },
      ...isActive !== void 0 && { active: !!isActive },
      ...active !== void 0 && { active: !!active },
      ...ingredients !== void 0 && { ingredients }
    };
    return res.json(devFallbackProducts[idx]);
  }
  const client = await getClient();
  try {
    await client.query("BEGIN");
    let resolvedCatId = null;
    if (categoryId || category) {
      resolvedCatId = await resolveCategoryId(client, categoryId, category);
    }
    const finalImage = imageUrl !== void 0 ? imageUrl : image;
    const finalPopular = isPopular !== void 0 ? isPopular : popular;
    const finalActive = isActive !== void 0 ? isActive : active;
    const finalPrice = price !== void 0 ? Number(price) : void 0;
    const updateResult = await client.query(
      `UPDATE products
       SET name = COALESCE($1, name),
           category_id = COALESCE($2, category_id),
           price = COALESCE($3, price),
           description = COALESCE($4, description),
           image_url = COALESCE($5, image_url),
           is_popular = COALESCE($6, is_popular),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        name ? name.trim() : null,
        resolvedCatId,
        finalPrice,
        description !== void 0 ? description?.trim() : null,
        finalImage,
        finalPopular !== void 0 ? !!finalPopular : null,
        finalActive !== void 0 ? !!finalActive : null,
        id
      ]
    );
    if (updateResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado." });
    }
    const finalIngNames = [];
    if (Array.isArray(ingredients)) {
      await client.query("DELETE FROM product_ingredients WHERE product_id = $1", [id]);
      for (let i = 0; i < ingredients.length; i++) {
        const ingName = String(ingredients[i]).trim();
        if (!ingName) continue;
        finalIngNames.push(ingName);
        const ingRes = await client.query(
          `INSERT INTO ingredients (id, name, is_active)
           VALUES ($1, $2, TRUE)
           ON CONFLICT (name) DO UPDATE SET is_active = TRUE
           RETURNING id`,
          [`ing-${Date.now()}-${i}`, ingName]
        );
        const ingId = ingRes.rows[0].id;
        await client.query(
          `INSERT INTO product_ingredients (product_id, ingredient_id, sort_order)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [id, ingId, i + 1]
        );
      }
    } else if (Array.isArray(ingredientIds)) {
      await client.query("DELETE FROM product_ingredients WHERE product_id = $1", [id]);
      for (let i = 0; i < ingredientIds.length; i++) {
        await client.query(
          `INSERT INTO product_ingredients (product_id, ingredient_id, sort_order)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [id, ingredientIds[i], i + 1]
        );
      }
    }
    const row = updateResult.rows[0];
    const catRes = await client.query("SELECT name FROM categories WHERE id = $1", [row.category_id]);
    const catName = catRes.rows[0]?.name || "Categor\xEDa";
    await client.query("COMMIT");
    const updated = formatProductRow(row, catName, finalIngNames.length > 0 ? finalIngNames : void 0);
    res.json(updated);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating product in DB:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
router4.patch("/:id/toggle", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackProducts.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Producto no encontrado." });
    devFallbackProducts[idx].active = !devFallbackProducts[idx].active;
    return res.json({ id, name: devFallbackProducts[idx].name, active: devFallbackProducts[idx].active });
  }
  try {
    const result = await query(
      `UPDATE products
       SET is_active = NOT is_active,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, is_active AS active`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router4.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!isDatabaseConfigured()) {
    const idx = devFallbackProducts.findIndex((p) => p.id === id);
    if (idx === -1) return res.status(404).json({ error: "Producto no encontrado." });
    const prodName = devFallbackProducts[idx].name;
    devFallbackProducts.splice(idx, 1);
    return res.json({ message: `Producto "${prodName}" eliminado exitosamente.`, deleted: true });
  }
  try {
    const prodCheck = await query("SELECT id, name FROM products WHERE id = $1", [id]);
    if (prodCheck.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }
    const prodName = prodCheck.rows[0].name;
    const historyCheck = await query(
      "SELECT count(*) FROM order_items WHERE product_id = $1",
      [id]
    );
    const orderCount = parseInt(historyCheck.rows[0].count, 10);
    if (orderCount > 0) {
      await query(
        "UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );
      return res.json({
        deleted: false,
        message: `El producto "${prodName}" cuenta con ${orderCount} registro(s) en el historial de pedidos. Ha sido desactivado del cat\xE1logo para preservar los registros contables.`,
        active: false
      });
    }
    await query("DELETE FROM product_ingredients WHERE product_id = $1", [id]);
    await query("DELETE FROM products WHERE id = $1", [id]);
    res.json({
      deleted: true,
      message: `Producto "${prodName}" eliminado permanentemente de la base de datos.`
    });
  } catch (error) {
    console.error("Error deleting product from DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
var products_default = router4;

// server/routes/orders.ts
import { Router as Router5 } from "express";

// server/services/excelReportService.ts
import ExcelJS from "exceljs";
var generateSalesReportExcel = async (rows, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.businessName || "Maracumango Neiva";
  workbook.lastModifiedBy = options.generatedBy || "Administrador Maracumango";
  workbook.created = /* @__PURE__ */ new Date();
  workbook.modified = /* @__PURE__ */ new Date();
  const worksheet = workbook.addWorksheet("Reporte de Ventas", {
    properties: { defaultRowHeight: 20 },
    views: [
      {
        state: "frozen",
        xSplit: 0,
        ySplit: 8
        // Freezes rows 1 through 8 (Headers remain visible while scrolling data)
      }
    ]
  });
  const businessName = options.businessName || "Maracumango \u2014 Granizados & Micheladas";
  const branchText = options.branchName || "Todas las Sedes (Consolidado)";
  const now = /* @__PURE__ */ new Date();
  const generationDateFormatted = now.toLocaleString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const totalOrdersCount = rows.length;
  const totalSales = rows.reduce((sum, r) => sum + (Number(r.total) || 0), 0);
  const averageTicket = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;
  const BRAND_DEEP_GREEN = "FF2D6A00";
  const BRAND_LIGHT_GREEN = "FFE8F3DC";
  const KPI_BOX_BG = "FFF3F6ED";
  const ZEBRA_ROW_EVEN = "FFFFFFFF";
  const ZEBRA_ROW_ODD = "FFF8FAF5";
  const BORDER_COLOR = "FFE1E4DA";
  const DARK_TEXT = "FF1A1C19";
  const MUTED_TEXT = "FF555A50";
  const subtleBorder = {
    top: { style: "thin", color: { argb: BORDER_COLOR } },
    bottom: { style: "thin", color: { argb: BORDER_COLOR } },
    left: { style: "thin", color: { argb: BORDER_COLOR } },
    right: { style: "thin", color: { argb: BORDER_COLOR } }
  };
  worksheet.getRow(1).height = 10;
  worksheet.mergeCells("A2:O2");
  const titleCell = worksheet.getCell("A2");
  titleCell.value = `REPORTE DE VENTAS \u2014 ${businessName.toUpperCase()}`;
  titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND_DEEP_GREEN }
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(2).height = 36;
  worksheet.mergeCells("A3:O3");
  const metaCell = worksheet.getCell("A3");
  metaCell.value = `Sede: ${branchText}  |  Fecha de Generaci\xF3n: ${generationDateFormatted}  |  Moneda: COP ($)`;
  metaCell.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: DARK_TEXT } };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND_LIGHT_GREEN }
  };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 12;
  worksheet.mergeCells("B5:D5");
  const kpiLabel1 = worksheet.getCell("B5");
  kpiLabel1.value = "CANTIDAD TOTAL DE PEDIDOS";
  kpiLabel1.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: MUTED_TEXT } };
  kpiLabel1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BOX_BG } };
  kpiLabel1.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("B6:D6");
  const kpiVal1 = worksheet.getCell("B6");
  kpiVal1.value = totalOrdersCount;
  kpiVal1.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  kpiVal1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BOX_BG } };
  kpiVal1.alignment = { horizontal: "center", vertical: "middle" };
  kpiVal1.numFmt = "#,##0";
  worksheet.mergeCells("F5:I5");
  const kpiLabel2 = worksheet.getCell("F5");
  kpiLabel2.value = "TOTAL VENTAS REGISTRADAS (COP)";
  kpiLabel2.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: MUTED_TEXT } };
  kpiLabel2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BOX_BG } };
  kpiLabel2.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("F6:I6");
  const kpiVal2 = worksheet.getCell("F6");
  kpiVal2.value = totalSales;
  kpiVal2.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  kpiVal2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BOX_BG } };
  kpiVal2.alignment = { horizontal: "center", vertical: "middle" };
  kpiVal2.numFmt = '"$"#,##0';
  worksheet.mergeCells("K5:N5");
  const kpiLabel3 = worksheet.getCell("K5");
  kpiLabel3.value = "PROMEDIO DE VENTA POR PEDIDO";
  kpiLabel3.font = { name: "Segoe UI", size: 8.5, bold: true, color: { argb: MUTED_TEXT } };
  kpiLabel3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BOX_BG } };
  kpiLabel3.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.mergeCells("K6:N6");
  const kpiVal3 = worksheet.getCell("K6");
  kpiVal3.value = averageTicket;
  kpiVal3.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  kpiVal3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KPI_BOX_BG } };
  kpiVal3.alignment = { horizontal: "center", vertical: "middle" };
  kpiVal3.numFmt = '"$"#,##0';
  const borderCols = [
    ["B", "C", "D"],
    ["F", "G", "H", "I"],
    ["K", "L", "M", "N"]
  ];
  borderCols.forEach((colGroup) => {
    colGroup.forEach((col) => {
      worksheet.getCell(`${col}5`).border = subtleBorder;
      worksheet.getCell(`${col}6`).border = subtleBorder;
    });
  });
  worksheet.getRow(5).height = 18;
  worksheet.getRow(6).height = 28;
  worksheet.getRow(7).height = 12;
  const headers = [
    "N\xFAmero Pedido",
    "Fecha y Hora",
    "Sede Operativa",
    "Cliente",
    "Tel\xE9fono",
    "Tipo Entrega",
    "Direcci\xF3n",
    "M\xE9todo Pago",
    "Subtotal (COP)",
    "Tarifa Domicilio (COP)",
    "Total (COP)",
    "Estado",
    "Aprobado Por",
    "Preparado Por",
    "Detalle de Productos"
  ];
  const headerRow = worksheet.getRow(8);
  headerRow.height = 30;
  headers.forEach((h, idx) => {
    const colNumber = idx + 1;
    const cell = headerRow.getCell(colNumber);
    cell.value = h;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_DEEP_GREEN }
    };
    cell.alignment = {
      horizontal: [9, 10, 11].includes(colNumber) ? "right" : "center",
      vertical: "middle",
      wrapText: false
    };
    cell.border = {
      top: { style: "medium", color: { argb: BRAND_DEEP_GREEN } },
      bottom: { style: "medium", color: { argb: BRAND_DEEP_GREEN } },
      left: { style: "thin", color: { argb: "FFFFFFFF" } },
      right: { style: "thin", color: { argb: "FFFFFFFF" } }
    };
  });
  worksheet.autoFilter = "A8:O8";
  let currentRowIndex = 9;
  for (const r of rows) {
    const row = worksheet.getRow(currentRowIndex);
    const isOdd = (currentRowIndex - 9) % 2 === 1;
    const rowFillColor = isOdd ? ZEBRA_ROW_ODD : ZEBRA_ROW_EVEN;
    let dateStr = "\u2014";
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleString("es-CO", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
      }
    }
    const phoneStr = r.customerPhone ? String(r.customerPhone).trim() : "\u2014";
    row.getCell(1).value = r.orderNumber || "\u2014";
    row.getCell(2).value = dateStr;
    row.getCell(3).value = r.sede || "Principal";
    row.getCell(4).value = r.customerName || "Cliente";
    row.getCell(5).value = phoneStr;
    row.getCell(6).value = r.deliveryMethod === "domicilio" ? "Domicilio" : "Recoger en Tienda";
    row.getCell(7).value = r.deliveryAddress || "En tienda";
    row.getCell(8).value = (r.paymentMethod || "Efectivo").toUpperCase();
    row.getCell(9).value = Number(r.subtotal) || 0;
    row.getCell(10).value = Number(r.deliveryFee) || 0;
    row.getCell(11).value = Number(r.total) || 0;
    row.getCell(12).value = r.status || "Completado";
    row.getCell(13).value = r.acceptedBy || "\u2014";
    row.getCell(14).value = r.preparedBy || "\u2014";
    row.getCell(15).value = r.productsDetail || "\u2014";
    row.getCell(9).numFmt = '"$"#,##0';
    row.getCell(10).numFmt = '"$"#,##0';
    row.getCell(11).numFmt = '"$"#,##0';
    row.getCell(5).numFmt = "@";
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(1).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: BRAND_DEEP_GREEN } };
    row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(4).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: DARK_TEXT } };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(11).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(11).font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: BRAND_DEEP_GREEN } };
    row.getCell(12).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(13).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(14).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(15).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      if (!cell.font) {
        cell.font = { name: "Segoe UI", size: 9.5, color: { argb: DARK_TEXT } };
      }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowFillColor }
      };
      cell.border = subtleBorder;
    }
    row.height = 24;
    currentRowIndex++;
  }
  const totalRowIndex = currentRowIndex;
  const totalRow = worksheet.getRow(totalRowIndex);
  worksheet.mergeCells(`A${totalRowIndex}:H${totalRowIndex}`);
  const summaryLabel = totalRow.getCell(1);
  summaryLabel.value = `TOTAL GENERAL (${totalOrdersCount} PEDIDOS CONSOLIDADOS)`;
  summaryLabel.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  summaryLabel.alignment = { horizontal: "right", vertical: "middle" };
  const startRow = 9;
  const endRow = totalRowIndex - 1;
  if (rows.length > 0) {
    totalRow.getCell(9).value = { formula: `SUM(I${startRow}:I${endRow})` };
    totalRow.getCell(10).value = { formula: `SUM(J${startRow}:J${endRow})` };
    totalRow.getCell(11).value = { formula: `SUM(K${startRow}:K${endRow})` };
  } else {
    totalRow.getCell(9).value = 0;
    totalRow.getCell(10).value = 0;
    totalRow.getCell(11).value = 0;
  }
  totalRow.getCell(9).numFmt = '"$"#,##0';
  totalRow.getCell(10).numFmt = '"$"#,##0';
  totalRow.getCell(11).numFmt = '"$"#,##0';
  totalRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(11).alignment = { horizontal: "right", vertical: "middle" };
  totalRow.getCell(9).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: DARK_TEXT } };
  totalRow.getCell(10).font = { name: "Segoe UI", size: 10, bold: true, color: { argb: DARK_TEXT } };
  totalRow.getCell(11).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: BRAND_DEEP_GREEN } };
  for (let c = 1; c <= 15; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND_LIGHT_GREEN }
    };
    cell.border = {
      top: { style: "thin", color: { argb: BRAND_DEEP_GREEN } },
      bottom: { style: "double", color: { argb: BRAND_DEEP_GREEN } },
      left: { style: "thin", color: { argb: BORDER_COLOR } },
      right: { style: "thin", color: { argb: BORDER_COLOR } }
    };
  }
  totalRow.height = 26;
  const defaultWidths = [
    16,
    // 1: N° Pedido
    18,
    // 2: Fecha y Hora
    22,
    // 3: Sede
    24,
    // 4: Cliente
    16,
    // 5: Teléfono
    18,
    // 6: Tipo Entrega
    30,
    // 7: Dirección
    16,
    // 8: Método Pago
    16,
    // 9: Subtotal
    18,
    // 10: Domicilio
    18,
    // 11: Total
    16,
    // 12: Estado
    20,
    // 13: Aprobado Por
    20,
    // 14: Preparado Por
    40
    // 15: Detalle Productos
  ];
  defaultWidths.forEach((width, idx) => {
    const col = worksheet.getColumn(idx + 1);
    col.width = width;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

// server/routes/orders.ts
var router5 = Router5();
var devFallbackOrders = [...INITIAL_ORDERS];
router5.get("/", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Sesi\xF3n requerida. Debes iniciar sesi\xF3n para consultar los pedidos."
    });
  }
  const role = req.user.role.toLowerCase();
  const workerBranchId = req.user.branchId;
  const filterBranchId = req.query.branchId;
  if (!isDatabaseConfigured()) {
    let orders = [...devFallbackOrders];
    if (role === "worker") {
      const activeBranch = workerBranchId || "sede-1";
      orders = orders.filter((o) => o.sedeId === activeBranch && o.status !== "PENDING_ADMIN" && o.status !== "CANCELLED");
    } else if (role === "customer") {
      orders = orders.filter(
        (o) => Boolean(o.customerId) && o.customerId === req.user?.id || Boolean(o.customerEmail) && o.customerEmail?.toLowerCase() === req.user?.email?.toLowerCase()
      );
    } else if (role === "admin") {
      if (filterBranchId && filterBranchId !== "all") {
        orders = orders.filter((o) => o.sedeId === filterBranchId);
      }
    } else {
      return res.status(403).json({ error: "Acceso no autorizado." });
    }
    return res.json(orders);
  }
  try {
    let sql = `
      SELECT 
        o.id,
        o.order_number AS "orderNumber",
        o.customer_name AS "customerName",
        o.customer_phone AS "customerPhone",
        o.branch_id AS "sedeId",
        b.name AS "sedeNombre",
        o.delivery_method AS "deliveryMethod",
        o.delivery_address AS "deliveryAddress",
        o.payment_method AS "paymentMethod",
        o.subtotal::float AS subtotal,
        o.delivery_fee::float AS "deliveryFee",
        o.total::float AS total,
        os.id AS "statusId",
        os.id AS status,
        os.name AS "statusName",
        os.label AS "statusLabel",
        o.notes,
        o.accepted_by AS "acceptedBy",
        o.accepted_at AS "acceptedAt",
        o.prepared_by AS "preparedBy",
        o.prepared_by_name AS "preparedByName",
        o.prepared_at AS "preparedAt",
        o.created_at AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'productId', oi.product_id,
              'productName', oi.product_name,
              'unitPrice', oi.unit_price::float,
              'quantity', oi.quantity,
              'subtotal', oi.subtotal::float,
              'notes', oi.notes,
              'ingredients', oi.ingredients_snapshot
            ) ORDER BY oi.created_at ASC
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) AS items
      FROM orders o
      JOIN branches b ON b.id = o.branch_id
      JOIN order_statuses os ON os.id = o.status_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    const conditions = [];
    const params = [];
    if (role === "worker") {
      const branch = workerBranchId || "sede-1";
      params.push(branch);
      conditions.push(`o.branch_id = $${params.length}`);
      conditions.push(`o.status_id NOT IN ('PENDING_ADMIN', 'CANCELLED', 'Cancelado')`);
    } else if (role === "customer") {
      params.push(req.user.id);
      params.push(req.user.email);
      conditions.push(`(o.customer_id = $${params.length - 1} OR o.customer_email = $${params.length})`);
    } else if (role === "admin") {
      if (filterBranchId && filterBranchId !== "all") {
        params.push(filterBranchId);
        conditions.push(`o.branch_id = $${params.length}`);
      }
    } else {
      return res.status(403).json({ error: "Rol no autorizado." });
    }
    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(" AND ");
    }
    sql += ` GROUP BY o.id, b.name, os.id, os.name, os.label ORDER BY o.created_at DESC`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders from DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
var handleExportCsv = async (req, res) => {
  const escapeCsv = (str) => {
    const val = str === null || str === void 0 ? "" : String(str);
    return `"${val.replace(/"/g, '""')}"`;
  };
  const header = [
    "Numero Pedido",
    "Fecha y Hora",
    "Sede",
    "Cliente",
    "Telefono",
    "Tipo Entrega",
    "Direccion",
    "Metodo Pago",
    "Subtotal (COP)",
    "Tarifa Domicilio (COP)",
    "Total (COP)",
    "Estado",
    "Aprobado Por",
    "Preparado Por",
    "Detalle Productos"
  ];
  if (!isDatabaseConfigured()) {
    const csvRows = [header.map(escapeCsv).join(",")];
    for (const r of devFallbackOrders) {
      csvRows.push([
        escapeCsv(r.orderNumber),
        escapeCsv(new Date(r.createdAt || Date.now()).toLocaleString("es-CO")),
        escapeCsv(r.sedeNombre || "Sede Principal"),
        escapeCsv(r.customerName),
        escapeCsv(r.customerPhone),
        escapeCsv(r.deliveryMethod),
        escapeCsv(r.deliveryAddress || "En tienda"),
        escapeCsv(r.paymentMethod),
        r.subtotal,
        r.deliveryFee || 0,
        r.total,
        escapeCsv(r.status),
        escapeCsv(r.acceptedBy || "N/A"),
        escapeCsv(r.preparedByName || "N/A"),
        escapeCsv((r.items || []).map((it) => `${it.productName} (${it.quantity}x)`).join(", "))
      ].join(","));
    }
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte_ventas_maracumango_${Date.now()}.csv"`
    );
    return res.send(csvContent);
  }
  try {
    const branchFilter = req.query.branchId;
    let sql = `
      SELECT 
        o.order_number,
        o.created_at,
        b.name AS sede,
        o.customer_name,
        o.customer_phone,
        o.delivery_method,
        COALESCE(o.delivery_address, 'En tienda') AS direccion,
        o.payment_method,
        o.subtotal::float AS subtotal,
        o.delivery_fee::float AS domicilio,
        o.total::float AS total,
        os.label AS estado,
        COALESCE(u_acc.first_name || ' ' || COALESCE(u_acc.last_name, ''), 'N/A') AS aprobado_por,
        COALESCE(o.prepared_by_name, 'N/A') AS preparado_por,
        COALESCE(
          string_agg(oi.product_name || ' (' || oi.quantity || 'x)', ', '), 'Sin items'
        ) AS productos
      FROM orders o
      JOIN branches b ON b.id = o.branch_id
      JOIN order_statuses os ON os.id = o.status_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN users u_acc ON u_acc.id = o.accepted_by
      WHERE o.status_id NOT IN ('CANCELLED', 'Cancelado')
    `;
    const params = [];
    if (branchFilter && branchFilter !== "all") {
      params.push(branchFilter);
      sql += ` AND o.branch_id = $1`;
    }
    sql += `
      GROUP BY o.id, b.name, os.label, u_acc.first_name, u_acc.last_name
      ORDER BY o.created_at DESC
    `;
    const result = await query(sql, params);
    const csvRows = [header.map(escapeCsv).join(",")];
    for (const r of result.rows) {
      const dateStr = new Date(r.created_at).toLocaleString("es-CO");
      csvRows.push([
        escapeCsv(r.order_number),
        escapeCsv(dateStr),
        escapeCsv(r.sede),
        escapeCsv(r.customer_name),
        escapeCsv(r.customer_phone),
        escapeCsv(r.delivery_method),
        escapeCsv(r.direccion),
        escapeCsv(r.payment_method),
        r.subtotal,
        r.domicilio,
        r.total,
        escapeCsv(r.estado),
        escapeCsv(r.aprobado_por),
        escapeCsv(r.preparado_por),
        escapeCsv(r.productos)
      ].join(","));
    }
    const csvContent = "\uFEFF" + csvRows.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte_ventas_maracumango_${Date.now()}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error("Error generating CSV export:", error.message);
    res.status(500).json({ error: error.message });
  }
};
var handleExportExcel = async (req, res) => {
  const branchFilter = req.query.branchId;
  if (!isDatabaseConfigured()) {
    const reportRows = devFallbackOrders.filter((o) => o.status !== "CANCELLED" && o.status !== "Cancelado").map((r) => ({
      orderNumber: r.orderNumber || `#MMC-${r.id || "00"}`,
      createdAt: r.createdAt || /* @__PURE__ */ new Date(),
      sede: r.sedeNombre || "Sede Principal",
      customerName: r.customerName || "Cliente",
      customerPhone: r.customerPhone || "\u2014",
      deliveryMethod: r.deliveryMethod || "recoger",
      deliveryAddress: r.deliveryAddress || "En tienda",
      paymentMethod: r.paymentMethod || "Efectivo",
      subtotal: Number(r.subtotal) || 0,
      deliveryFee: Number(r.deliveryFee) || 0,
      total: Number(r.total) || 0,
      status: r.status || "Completado",
      acceptedBy: r.acceptedBy || "N/A",
      preparedBy: r.preparedByName || "N/A",
      productsDetail: (r.items || []).map((it) => `${it.productName} (${it.quantity}x)`).join(", ") || "Sin items"
    }));
    const buffer = await generateSalesReportExcel(reportRows, {
      businessName: "Maracumango \u2014 Granizados & Micheladas Artesanales",
      branchName: branchFilter && branchFilter !== "all" ? branchFilter : "Todas las Sedes (Consolidado)",
      generatedBy: req.user ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() : "Administrador"
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte_ventas_maracumango_${Date.now()}.xlsx"`
    );
    return res.send(buffer);
  }
  try {
    let sql = `
      SELECT 
        o.order_number AS "orderNumber",
        o.created_at AS "createdAt",
        b.name AS sede,
        o.customer_name AS "customerName",
        o.customer_phone AS "customerPhone",
        o.delivery_method AS "deliveryMethod",
        COALESCE(o.delivery_address, 'En tienda') AS "deliveryAddress",
        o.payment_method AS "paymentMethod",
        o.subtotal::float AS subtotal,
        o.delivery_fee::float AS "deliveryFee",
        o.total::float AS total,
        os.label AS status,
        COALESCE(u_acc.first_name || ' ' || COALESCE(u_acc.last_name, ''), 'N/A') AS "acceptedBy",
        COALESCE(o.prepared_by_name, 'N/A') AS "preparedBy",
        COALESCE(
          string_agg(oi.product_name || ' (' || oi.quantity || 'x)', ', '), 'Sin items'
        ) AS "productsDetail"
      FROM orders o
      JOIN branches b ON b.id = o.branch_id
      JOIN order_statuses os ON os.id = o.status_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN users u_acc ON u_acc.id = o.accepted_by
      WHERE o.status_id NOT IN ('CANCELLED', 'Cancelado')
    `;
    const params = [];
    if (branchFilter && branchFilter !== "all") {
      params.push(branchFilter);
      sql += ` AND o.branch_id = $1`;
    }
    sql += `
      GROUP BY o.id, b.name, os.label, u_acc.first_name, u_acc.last_name
      ORDER BY o.created_at DESC
    `;
    const result = await query(sql, params);
    const reportRows = result.rows.map((r) => ({
      orderNumber: r.orderNumber,
      createdAt: r.createdAt,
      sede: r.sede,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      deliveryMethod: r.deliveryMethod,
      deliveryAddress: r.deliveryAddress,
      paymentMethod: r.paymentMethod,
      subtotal: Number(r.subtotal) || 0,
      deliveryFee: Number(r.deliveryFee) || 0,
      total: Number(r.total) || 0,
      status: r.status,
      acceptedBy: r.acceptedBy,
      preparedBy: r.preparedBy,
      productsDetail: r.productsDetail
    }));
    const buffer = await generateSalesReportExcel(reportRows, {
      businessName: "Maracumango \u2014 Granizados & Micheladas Artesanales",
      branchName: branchFilter && branchFilter !== "all" && reportRows[0] ? reportRows[0].sede : "Todas las Sedes (Consolidado)",
      generatedBy: req.user ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() : "Administrador"
    });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte_ventas_maracumango_${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error generating Excel export:", error.message);
    res.status(500).json({ error: error.message });
  }
};
router5.get("/export-csv", requireAdmin, handleExportCsv);
router5.get("/export/csv", requireAdmin, handleExportCsv);
router5.get("/export-excel", requireAdmin, handleExportExcel);
router5.get("/export/excel", requireAdmin, handleExportExcel);
router5.get("/export-xlsx", requireAdmin, handleExportExcel);
router5.post("/", validateCustomerOrder, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Debes iniciar sesi\xF3n o crear una cuenta para poder realizar tu pedido.",
      requiresAuth: true
    });
  }
  const {
    customerName,
    customerPhone,
    sedeId,
    deliveryMethod,
    deliveryAddress,
    deliveryFee = 0,
    paymentMethod,
    notes,
    items
  } = req.body;
  const targetSedeId = sedeId || "sede-1";
  const finalCustomerName = (customerName || req.user.name || req.user.firstName || "Cliente").trim();
  const finalCustomerPhone = (customerPhone || req.user.phone || "").trim();
  const customerId = req.user.id;
  const customerEmail = req.user.email;
  if (!isDatabaseConfigured()) {
    const nextNum = 100 + Math.floor(Math.random() * 900);
    const subtotal = items.reduce((sum, it) => sum + (it.unitPrice || 14e3) * it.quantity, 0);
    const total = subtotal + Number(deliveryFee);
    const fallbackOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `#MMC-${nextNum}`,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerId,
      customerEmail,
      sedeId: targetSedeId,
      sedeNombre: targetSedeId === "sede-2" ? "Sede Sector Edsbur / \xDAnico" : "Sede Parque del Amor y la Amistad",
      deliveryMethod,
      deliveryAddress: deliveryMethod === "domicilio" ? deliveryAddress?.trim() : void 0,
      paymentMethod,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName || "Producto",
        unitPrice: it.unitPrice || 14e3,
        quantity: it.quantity,
        ingredients: it.ingredients || ["Ingredientes seleccionados"],
        notes: it.notes
      })),
      subtotal,
      deliveryFee: Number(deliveryFee),
      total,
      status: "PENDING_ADMIN",
      statusLabel: "Pendiente de Aprobaci\xF3n Admin",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      notes: notes ? notes.trim() : void 0
    };
    devFallbackOrders.unshift(fallbackOrder);
    return res.status(201).json(fallbackOrder);
  }
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const productIds = items.map((i) => i.productId);
    const productsRes = await client.query(
      `SELECT p.id, p.name, p.price,
        COALESCE(
          json_agg(i.name ORDER BY pi.sort_order ASC) FILTER (WHERE i.name IS NOT NULL),
          '[]'
        ) AS ingredients
       FROM products p
       LEFT JOIN product_ingredients pi ON pi.product_id = p.id
       LEFT JOIN ingredients i ON i.id = pi.ingredient_id
       WHERE p.id = ANY($1::varchar[])
       GROUP BY p.id`,
      [productIds]
    );
    const productMap = new Map(productsRes.rows.map((p) => [p.id, p]));
    let calculatedSubtotal = 0;
    const validatedItems = items.map((item) => {
      const prod = productMap.get(item.productId);
      const unitPrice = prod ? Number(prod.price) : Number(item.unitPrice || 0);
      const itemSubtotal = unitPrice * item.quantity;
      calculatedSubtotal += itemSubtotal;
      return {
        productId: item.productId,
        productName: prod ? prod.name : item.productName || "Producto",
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null,
        ingredientsSnapshot: prod ? prod.ingredients : item.ingredients || []
      };
    });
    const fee = Number(deliveryFee) || 0;
    const calculatedTotal = calculatedSubtotal + fee;
    const countRes = await client.query("SELECT COUNT(*) FROM orders");
    const orderSequence = 100 + Number(countRes.rows[0].count) + 1;
    const orderNumber = `#MMC-${orderSequence}`;
    const orderId = `ord-${Date.now()}`;
    const orderInsert = await client.query(
      `INSERT INTO orders (
        id, order_number, customer_name, customer_phone, customer_id, customer_email, branch_id,
        delivery_method, delivery_address, delivery_fee, payment_method,
        subtotal, total, status_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING_ADMIN', $14)
      RETURNING *`,
      [
        orderId,
        orderNumber,
        finalCustomerName,
        finalCustomerPhone,
        customerId,
        customerEmail,
        targetSedeId,
        deliveryMethod,
        deliveryMethod === "domicilio" ? deliveryAddress?.trim() : null,
        fee,
        paymentMethod,
        calculatedSubtotal,
        calculatedTotal,
        notes ? notes.trim() : null
      ]
    );
    for (const it of validatedItems) {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await client.query(
        `INSERT INTO order_items (
          id, order_id, product_id, product_name, unit_price, quantity, subtotal, notes, ingredients_snapshot
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          itemId,
          orderId,
          it.productId,
          it.productName,
          it.unitPrice,
          it.quantity,
          it.subtotal,
          it.notes,
          JSON.stringify(it.ingredientsSnapshot)
        ]
      );
    }
    await client.query("COMMIT");
    const created = orderInsert.rows[0];
    res.status(201).json({
      id: created.id,
      orderNumber: created.order_number,
      customerName: created.customer_name,
      customerPhone: created.customer_phone,
      sedeId: created.branch_id,
      deliveryMethod: created.delivery_method,
      deliveryAddress: created.delivery_address,
      deliveryFee: Number(created.delivery_fee),
      paymentMethod: created.payment_method,
      subtotal: Number(created.subtotal),
      total: Number(created.total),
      status: "PENDING_ADMIN",
      statusLabel: "Pendiente de Aprobaci\xF3n Admin",
      notes: created.notes,
      items: validatedItems,
      createdAt: created.created_at
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating order in DB:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});
router5.patch("/:id/accept", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || "user-admin-1";
  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (!found) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }
    found.status = "ACCEPTED";
    found.statusLabel = "Aceptado por Admin";
    found.acceptedBy = adminId;
    found.acceptedAt = (/* @__PURE__ */ new Date()).toISOString();
    return res.json({ id, status: "ACCEPTED", statusLabel: "Aceptado por Admin", order: found });
  }
  try {
    const result = await query(
      `UPDATE orders
       SET status_id = 'ACCEPTED',
           accepted_by = $1,
           accepted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status_id IN ('PENDING_ADMIN', 'Pendiente')
       RETURNING *`,
      [adminId, id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "El pedido no se encuentra pendiente de aprobaci\xF3n o ya fue aceptado/cancelado."
      });
    }
    res.json({
      message: "Pedido aprobado exitosamente por administraci\xF3n. Disponible en la estaci\xF3n de barra para preparaci\xF3n.",
      status: "ACCEPTED",
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router5.patch("/:id/confirm", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const adminId = req.user?.id || "user-admin-1";
  if (!isDatabaseConfigured()) {
    return res.json({ id, status: "ACCEPTED", statusLabel: "Aceptado por Admin" });
  }
  try {
    const result = await query(
      `UPDATE orders
       SET status_id = 'ACCEPTED',
           accepted_by = $1,
           accepted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status_id IN ('PENDING_ADMIN', 'Pendiente')
       RETURNING *`,
      [adminId, id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        error: "El pedido no se encuentra pendiente o ya fue aceptado/cancelado."
      });
    }
    res.json({
      message: "Pedido confirmado exitosamente.",
      status: "ACCEPTED",
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router5.patch("/:id/start-preparation", requireWorkerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const workerId = user?.id || "user-worker-1";
  const workerName = user ? user.firstName + (user.lastName ? " " + user.lastName : "") : "Trabajador de Barra";
  const userBranch = user?.branchId;
  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (!found) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }
    if (user?.role === "WORKER" && userBranch && found.sedeId !== userBranch) {
      return res.status(403).json({ error: "No puedes tomar pedidos asignados a otra sede operativa." });
    }
    if (found.status !== "ACCEPTED") {
      return res.status(400).json({ error: "El pedido no est\xE1 disponible para preparaci\xF3n." });
    }
    found.status = "PREPARING";
    found.statusLabel = "En preparaci\xF3n";
    found.preparedBy = workerId;
    found.preparedByName = workerName;
    found.preparedAt = (/* @__PURE__ */ new Date()).toISOString();
    return res.json({
      id,
      status: "PREPARING",
      preparedBy: workerId,
      preparedByName: workerName,
      order: found
    });
  }
  try {
    if (user?.role === "WORKER" && userBranch) {
      const branchCheck = await query("SELECT branch_id FROM orders WHERE id = $1", [id]);
      if (branchCheck.rows.length > 0 && branchCheck.rows[0].branch_id !== userBranch) {
        return res.status(403).json({
          error: "No puedes tomar pedidos asignados a otra sede operativa."
        });
      }
    }
    const result = await query(
      `UPDATE orders
       SET status_id = 'PREPARING',
           prepared_by = $1,
           prepared_by_name = $2,
           prepared_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status_id = 'ACCEPTED' AND prepared_by IS NULL
       RETURNING *`,
      [workerId, workerName, id]
    );
    if (result.rows.length === 0) {
      const current = await query(
        "SELECT status_id, prepared_by, prepared_by_name FROM orders WHERE id = $1",
        [id]
      );
      if (current.rows.length === 0) {
        return res.status(404).json({ error: "Pedido no encontrado." });
      }
      const row = current.rows[0];
      if (row.prepared_by || row.status_id === "PREPARING") {
        return res.status(409).json({
          error: `Este pedido ya fue tomado previamente por ${row.prepared_by_name || "otro trabajador"}.`,
          preparedBy: row.prepared_by,
          preparedByName: row.prepared_by_name
        });
      }
      if (row.status_id === "CANCELLED" || row.status_id === "Cancelado") {
        return res.status(400).json({ error: "Este pedido fue cancelado y no puede ser preparado." });
      }
      if (row.status_id === "DELIVERED" || row.status_id === "READY") {
        return res.status(400).json({ error: "Este pedido ya complet\xF3 su etapa de preparaci\xF3n." });
      }
      if (row.status_id === "PENDING_ADMIN") {
        return res.status(400).json({
          error: "El pedido a\xFAn est\xE1 pendiente de aprobaci\xF3n por el administrador."
        });
      }
      return res.status(400).json({ error: "El pedido no est\xE1 disponible para preparaci\xF3n." });
    }
    res.json({
      message: `\xA1Pedido tomado exitosamente por ${workerName}! En preparaci\xF3n.`,
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router5.patch("/:id/status", requireWorkerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;
  const isWorker = user?.role === "WORKER";
  const STATUS_MAP = {
    "Pendiente": "PENDING_ADMIN",
    "Pendiente Admin": "PENDING_ADMIN",
    "PENDING_ADMIN": "PENDING_ADMIN",
    "Aceptado": "ACCEPTED",
    "ACCEPTED": "ACCEPTED",
    "En preparaci\xF3n": "PREPARING",
    "PREPARING": "PREPARING",
    "Listo": "READY",
    "READY": "READY",
    "Entregado": "DELIVERED",
    "DELIVERED": "DELIVERED",
    "Cancelado": "CANCELLED",
    "CANCELLED": "CANCELLED"
  };
  const targetStatusId = STATUS_MAP[status];
  if (!targetStatusId) {
    return res.status(400).json({ error: "Estado de pedido inv\xE1lido." });
  }
  if (isWorker && targetStatusId === "CANCELLED") {
    return res.status(403).json({
      error: "Los trabajadores no tienen autorizaci\xF3n para cancelar pedidos. Comun\xEDcate con administraci\xF3n."
    });
  }
  if (isWorker && targetStatusId === "ACCEPTED") {
    return res.status(403).json({
      error: "Solo el administrador puede aprobar pedidos pendientes."
    });
  }
  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (!found) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }
    if (found.status === "DELIVERED") {
      return res.status(400).json({
        error: "El pedido ya fue entregado y su registro es definitivo. No se pueden alterar estados de pedidos entregados."
      });
    }
    if (isWorker && found.status === "READY" && (targetStatusId === "PREPARING" || targetStatusId === "ACCEPTED")) {
      return res.status(400).json({
        error: "No est\xE1 permitido revertir pedidos que ya est\xE1n marcados como listos."
      });
    }
    if (isWorker && targetStatusId === "READY" && found.preparedBy && found.preparedBy !== user?.id) {
      return res.status(403).json({
        error: `Solo el colaborador que inici\xF3 la preparaci\xF3n (${found.preparedByName || "otro trabajador"}) puede marcar este pedido como listo.`
      });
    }
    found.status = targetStatusId;
    found.statusLabel = targetStatusId === "READY" ? "Listo" : targetStatusId === "DELIVERED" ? "Entregado" : targetStatusId;
    return res.json({ id, status: targetStatusId, order: found });
  }
  try {
    const orderCheck = await query("SELECT status_id, branch_id, prepared_by, prepared_by_name FROM orders WHERE id = $1", [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }
    const currentStatus = orderCheck.rows[0].status_id;
    if (currentStatus === "DELIVERED") {
      return res.status(400).json({
        error: "El pedido ya fue entregado y su registro es definitivo. No se pueden alterar estados de pedidos entregados."
      });
    }
    if (isWorker) {
      if (currentStatus === "READY" && targetStatusId === "PREPARING") {
        return res.status(400).json({
          error: "No est\xE1 permitido revertir pedidos que ya est\xE1n marcados como listos."
        });
      }
      if (currentStatus === "READY" && targetStatusId === "ACCEPTED") {
        return res.status(400).json({
          error: "Operaci\xF3n no permitida."
        });
      }
      if (targetStatusId === "READY") {
        const preparerId = orderCheck.rows[0].prepared_by;
        const preparerName = orderCheck.rows[0].prepared_by_name;
        if (preparerId && preparerId !== user?.id) {
          return res.status(403).json({
            error: `Solo el colaborador que inici\xF3 la preparaci\xF3n (${preparerName || "otro trabajador"}) puede marcar este pedido como listo.`
          });
        }
      }
    }
    const result = await query(
      `UPDATE orders
       SET status_id = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [targetStatusId, id]
    );
    res.json({
      message: "Estado de pedido actualizado exitosamente.",
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router5.patch("/:id/cancel", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (found) {
      if (found.status === "DELIVERED") {
        return res.status(400).json({
          error: "No es posible cancelar un pedido que ya fue entregado al cliente."
        });
      }
      found.status = "CANCELLED";
      found.statusLabel = "Cancelado";
      if (reason) {
        found.notes = (found.notes ? found.notes + " | " : "") + `Cancelaci\xF3n: ${reason}`;
      }
    }
    return res.json({ id, status: "CANCELLED", statusLabel: "Cancelado", order: found });
  }
  try {
    const check = await query("SELECT status_id FROM orders WHERE id = $1", [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Pedido no encontrado." });
    }
    if (check.rows[0].status_id === "DELIVERED") {
      return res.status(400).json({
        error: "No es posible cancelar un pedido que ya fue entregado al cliente."
      });
    }
    const notesAppend = reason ? ` | Cancelaci\xF3n: ${reason}` : "";
    const result = await query(
      `UPDATE orders
       SET status_id = 'CANCELLED',
           notes = CASE WHEN $1::text != '' THEN COALESCE(notes, '') || $1::text ELSE notes END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [notesAppend, id]
    );
    res.json({
      message: "Pedido cancelado exitosamente por administraci\xF3n.",
      order: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var orders_default = router5;

// server/routes/settings.ts
import { Router as Router6 } from "express";
var router6 = Router6();
var devFallbackSettings = {
  businessName: DEFAULT_BUSINESS_CONFIG.businessName,
  logoUrl: "/logo-maracumango.png",
  mainAddress: DEFAULT_BUSINESS_CONFIG.mainAddress,
  city: DEFAULT_BUSINESS_CONFIG.city,
  whatsappNumber: DEFAULT_BUSINESS_CONFIG.whatsappNumber,
  shiftInfo: DEFAULT_BUSINESS_CONFIG.shiftInfo
};
router6.get("/", async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.json(devFallbackSettings);
  }
  try {
    const result = await query("SELECT * FROM business_settings WHERE id = $1", ["default"]);
    if (result.rows.length === 0) {
      return res.json({
        businessName: "Maracumango",
        logoUrl: "/logo-maracumango.png",
        mainAddress: "Cra. 7 / Calle 21, Parque del Amor y la Amistad",
        city: "Neiva, Huila",
        whatsappNumber: "3177401873",
        shiftInfo: "Turno 1: 7:30 a.m. \u2013 2:30 p.m. | Turno 2: 2:30 p.m. \u2013 11:00 p.m."
      });
    }
    const row = result.rows[0];
    res.json({
      businessName: row.business_name,
      logoUrl: row.logo_url,
      mainAddress: row.main_address,
      city: row.city,
      whatsappNumber: row.general_whatsapp,
      shiftInfo: row.shift_info
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router6.put("/", requireAdmin, async (req, res) => {
  const { businessName, logoUrl, mainAddress, city, whatsappNumber, shiftInfo } = req.body;
  if (!isDatabaseConfigured()) {
    devFallbackSettings.businessName = businessName !== void 0 ? businessName : devFallbackSettings.businessName;
    devFallbackSettings.logoUrl = logoUrl !== void 0 ? logoUrl : devFallbackSettings.logoUrl;
    devFallbackSettings.mainAddress = mainAddress !== void 0 ? mainAddress : devFallbackSettings.mainAddress;
    devFallbackSettings.city = city !== void 0 ? city : devFallbackSettings.city;
    devFallbackSettings.whatsappNumber = whatsappNumber !== void 0 ? whatsappNumber : devFallbackSettings.whatsappNumber;
    devFallbackSettings.shiftInfo = shiftInfo !== void 0 ? shiftInfo : devFallbackSettings.shiftInfo;
    return res.json({
      message: "Configuraci\xF3n de identidad visual y negocio actualizada con \xE9xito (Modo local).",
      settings: devFallbackSettings
    });
  }
  try {
    const result = await query(
      `INSERT INTO business_settings (id, business_name, logo_url, main_address, city, general_whatsapp, shift_info, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         business_name = COALESCE($1, business_settings.business_name),
         logo_url = COALESCE($2, business_settings.logo_url),
         main_address = COALESCE($3, business_settings.main_address),
         city = COALESCE($4, business_settings.city),
         general_whatsapp = COALESCE($5, business_settings.general_whatsapp),
         shift_info = COALESCE($6, business_settings.shift_info),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [businessName, logoUrl, mainAddress, city, whatsappNumber, shiftInfo]
    );
    const row = result.rows[0];
    res.json({
      message: "Configuraci\xF3n de identidad visual y negocio actualizada con \xE9xito.",
      settings: {
        businessName: row.business_name,
        logoUrl: row.logo_url,
        mainAddress: row.main_address,
        city: row.city,
        whatsappNumber: row.general_whatsapp,
        shiftInfo: row.shift_info
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var settings_default = router6;

// server/routes/auth.ts
import { Router as Router7 } from "express";
import bcrypt from "bcryptjs";
import jwt2 from "jsonwebtoken";

// server/middleware/securityLimiter.ts
var inMemoryAttempts = /* @__PURE__ */ new Map();
var MAX_ALLOWED_ATTEMPTS = 5;
var LOCKOUT_MINUTES = 15;
var LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1e3;
var normalizeIdentifier = (prefix, key) => {
  return `${prefix}:${key.toLowerCase().trim()}`;
};
var checkSecurityLockout = async (identifier) => {
  const now = Date.now();
  const mem = inMemoryAttempts.get(identifier);
  if (mem && mem.blockedUntil && mem.blockedUntil > now) {
    const remainingMinutes = Math.max(1, Math.ceil((mem.blockedUntil - now) / 6e4));
    return {
      isBlocked: true,
      remainingMinutes,
      message: `Has superado el l\xEDmite de intentos permitidos. Por seguridad, el acceso est\xE1 bloqueado durante ${remainingMinutes} minuto(s). Intenta m\xE1s tarde.`
    };
  }
  if (isDatabaseConfigured()) {
    try {
      const res = await query(
        `SELECT attempt_count, blocked_until FROM security_attempt_logs WHERE identifier = $1`,
        [identifier]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        if (row.blocked_until) {
          const dbBlockedUntil = new Date(row.blocked_until).getTime();
          if (dbBlockedUntil > now) {
            const remainingMinutes = Math.max(1, Math.ceil((dbBlockedUntil - now) / 6e4));
            inMemoryAttempts.set(identifier, {
              count: row.attempt_count,
              blockedUntil: dbBlockedUntil,
              lastAttempt: now
            });
            return {
              isBlocked: true,
              remainingMinutes,
              message: `Has superado el l\xEDmite de intentos permitidos. Por seguridad, el acceso est\xE1 bloqueado durante ${remainingMinutes} minuto(s). Intenta m\xE1s tarde.`
            };
          }
        }
      }
    } catch (err) {
      console.warn("\u26A0\uFE0F [securityLimiter]: Error al verificar bloqueo en BD:", err.message);
    }
  }
  return { isBlocked: false };
};
var recordFailedAttempt = async (identifier) => {
  const now = Date.now();
  let currentCount = 1;
  let blockedUntil = null;
  const mem = inMemoryAttempts.get(identifier);
  if (mem) {
    if (mem.blockedUntil && mem.blockedUntil <= now) {
      currentCount = 1;
    } else {
      currentCount = mem.count + 1;
    }
  }
  if (currentCount >= MAX_ALLOWED_ATTEMPTS) {
    blockedUntil = now + LOCKOUT_MS;
  }
  inMemoryAttempts.set(identifier, {
    count: currentCount,
    blockedUntil,
    lastAttempt: now
  });
  if (isDatabaseConfigured()) {
    try {
      await query(
        `INSERT INTO security_attempt_logs (identifier, attempt_count, blocked_until, last_attempt)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (identifier) DO UPDATE SET
           attempt_count = EXCLUDED.attempt_count,
           blocked_until = EXCLUDED.blocked_until,
           last_attempt = CURRENT_TIMESTAMP`,
        [identifier, currentCount, blockedUntil ? new Date(blockedUntil).toISOString() : null]
      );
    } catch (err) {
      console.warn("\u26A0\uFE0F [securityLimiter]: Error al registrar intento fallido en BD:", err.message);
    }
  }
  if (currentCount >= MAX_ALLOWED_ATTEMPTS) {
    return {
      isBlocked: true,
      attemptsLeft: 0,
      remainingMinutes: LOCKOUT_MINUTES,
      message: `Has superado el l\xEDmite de ${MAX_ALLOWED_ATTEMPTS} intentos permitidos. Por seguridad, el acceso para esta cuenta o dispositivo est\xE1 bloqueado durante ${LOCKOUT_MINUTES} minutos.`
    };
  }
  const attemptsLeft = MAX_ALLOWED_ATTEMPTS - currentCount;
  return {
    isBlocked: false,
    attemptsLeft,
    message: `Credenciales o c\xF3digo incorrectos. Te quedan ${attemptsLeft} intento(s) permitido(s) antes del bloqueo temporal de ${LOCKOUT_MINUTES} minutos.`
  };
};
var resetSecurityAttempts = async (identifier) => {
  inMemoryAttempts.delete(identifier);
  if (isDatabaseConfigured()) {
    try {
      await query(`DELETE FROM security_attempt_logs WHERE identifier = $1`, [identifier]);
    } catch (err) {
      console.warn("\u26A0\uFE0F [securityLimiter]: Error al limpiar intentos en BD:", err.message);
    }
  }
};

// server/services/emailService.ts
import nodemailer from "nodemailer";
var buildResetEmailHtml = (code, recipientName) => {
  const greeting = recipientName ? `Hola <strong>${recipientName}</strong>,` : "Hola,";
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>C\xF3digo de Recuperaci\xF3n - Maracumango</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f8f3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1c19;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f6f8f3; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e1e4da; overflow: hidden;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #2d6a00 0%, #468600 100%); padding: 28px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                \u{1F96D} Maracumango
              </h1>
              <p style="margin: 6px 0 0; color: #d8f5a2; font-size: 13px; font-weight: 500;">
                Granizados & Micheladas Artesanales \u2022 Neiva, Huila
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="font-size: 16px; margin: 0 0 14px; color: #1a1c19;">
                ${greeting}
              </p>
              <p style="font-size: 14px; line-height: 1.5; color: #43483f; margin: 0 0 24px;">
                Recibimos una solicitud para restablecer la contrase\xF1a de acceso a tu cuenta. Usa el siguiente c\xF3digo de verificaci\xF3n de 6 d\xEDgitos para continuar:
              </p>

              <!-- Code Box -->
              <div style="background-color: #f1f5ea; border: 2px dashed #468600; border-radius: 16px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2d6a00; display: inline-block;">
                  ${code}
                </span>
                <p style="margin: 8px 0 0; font-size: 12px; color: #5f655b; font-weight: 600;">
                  \u23F3 V\xE1lido \xFAnicamente durante los pr\xF3ximos 15 minutos
                </p>
              </div>

              <div style="background-color: #fff9e6; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.4; color: #78350f;">
                  <strong>Seguridad:</strong> Se permite un m\xE1ximo de 5 intentos fallidos. Si t\xFA no solicitaste este c\xF3digo, puedes ignorar este correo de forma segura; tu contrase\xF1a seguir\xE1 protegida.
                </p>
              </div>

              <p style="font-size: 12px; color: #73796e; line-height: 1.4; margin: 0;">
                Si necesitas ayuda adicional, cont\xE1ctanos a trav\xE9s de nuestras l\xEDneas oficiales en Neiva.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8faf5; padding: 18px 24px; border-top: 1px solid #e1e4da; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #8d9387;">
                \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Maracumango Neiva. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
var sendPasswordResetEmail = async (toEmail, code, recipientName) => {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.RESEND_FROM || "Maracumango <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: `${code} es tu c\xF3digo de recuperaci\xF3n - Maracumango`,
          html: buildResetEmailHtml(code, recipientName)
        })
      });
      if (res.ok) {
        console.log(`\u2705 [EmailService:Resend] Correo enviado exitosamente a ${toEmail}`);
        return { sent: true, message: "Correo enviado exitosamente v\xEDa Resend." };
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn("\u26A0\uFE0F [EmailService:Resend Error]:", errJson);
      }
    } catch (err) {
      console.warn("\u26A0\uFE0F [EmailService:Resend Exception]:", err.message);
    }
  }
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;
  const smtpFrom = process.env.SMTP_FROM || (gmailUser ? `"Maracumango Neiva" <${gmailUser}>` : '"Maracumango Neiva" <notificaciones@maracumango.com>');
  let transporter = null;
  if (gmailUser && gmailPass) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
  } else if (smtpHost && smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
  }
  if (transporter) {
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject: `${code} es tu c\xF3digo de recuperaci\xF3n de contrase\xF1a - Maracumango`,
        text: `Hola ${recipientName || "Cliente"},

Tu c\xF3digo de recuperaci\xF3n de contrase\xF1a para Maracumango es: ${code}

Este c\xF3digo vence en 15 minutos.

Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.

Maracumango - Neiva, Huila`,
        html: buildResetEmailHtml(code, recipientName)
      });
      console.log(`\u2705 [EmailService:SMTP] Correo de recuperaci\xF3n enviado exitosamente a ${toEmail}`);
      return { sent: true, message: "Correo enviado exitosamente v\xEDa SMTP." };
    } catch (err) {
      console.error("\u274C [EmailService:SMTP Error]:", err.message);
      return {
        sent: false,
        message: "Fallo al despachar el correo mediante el servidor SMTP.",
        error: err.message
      };
    }
  }
  console.log("\u2139\uFE0F [EmailService]: No hay credenciales de correo (Gmail/SMTP/Resend) configuradas en las variables de entorno.");
  return {
    sent: false,
    message: "El servidor no tiene configurado un servicio de correo SMTP."
  };
};

// server/routes/auth.ts
var router7 = Router7();
var JWT_SECRET2 = process.env.JWT_SECRET || "maracumango_super_secret_jwt_key_2026_prod";
var devFallbackCustomers = [];
var devFallbackResetTokens = [];
var patchMissingUserColumns = async () => {
  if (!isDatabaseConfigured()) return;
  try {
    await query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS default_address VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      -- Ensure registered customers are never stored as workers or staff
      UPDATE users SET role_id = 'CUSTOMER', branch_id = NULL WHERE id LIKE 'cust-%' AND role_id != 'CUSTOMER';
    `);
  } catch (err) {
    console.warn("\u26A0\uFE0F [patchMissingUserColumns]:", err.message);
  }
};
router7.post("/register-customer", async (req, res) => {
  const { name, firstName, lastName, email, phone, password, defaultAddress, acceptedTerms } = req.body;
  const resolvedFirstName = (firstName || name || "").trim();
  const cleanEmail = (email || "").toLowerCase().trim();
  const cleanPhone = (phone || "").trim();
  const cleanAddress = (defaultAddress || "").trim();
  if (!resolvedFirstName) {
    return res.status(400).json({ error: "El nombre completo es obligatorio." });
  }
  if (!cleanEmail || !VALID_EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: "Ingresa un correo electr\xF3nico v\xE1lido." });
  }
  if (!cleanPhone || cleanPhone.length < 7) {
    return res.status(400).json({ error: "Ingresa un n\xFAmero de tel\xE9fono o celular v\xE1lido." });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "La contrase\xF1a debe tener al menos 6 caracteres." });
  }
  if (!acceptedTerms) {
    return res.status(400).json({
      error: "Debes aceptar los T\xE9rminos, Condiciones y la Pol\xEDtica de Tratamiento de Datos Personales (Habeas Data) para registrarte."
    });
  }
  const userId = `cust-${Date.now()}`;
  if (!isDatabaseConfigured()) {
    const existing = devFallbackCustomers.find((c) => c.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: "Ya existe una cuenta registrada con este correo electr\xF3nico." });
    }
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const newDevCustomer = {
      id: userId,
      name: resolvedFirstName,
      firstName: resolvedFirstName,
      lastName: lastName ? lastName.trim() : null,
      email: cleanEmail,
      phone: cleanPhone,
      defaultAddress: cleanAddress,
      passwordHash,
      role: "CUSTOMER",
      roleId: "CUSTOMER",
      branchId: null,
      acceptedTerms: true,
      active: true
    };
    devFallbackCustomers.push(newDevCustomer);
    const tokenPayload = {
      id: newDevCustomer.id,
      name: newDevCustomer.name,
      firstName: newDevCustomer.firstName,
      lastName: newDevCustomer.lastName,
      email: newDevCustomer.email,
      phone: newDevCustomer.phone,
      defaultAddress: newDevCustomer.defaultAddress,
      role: "CUSTOMER",
      roleId: "CUSTOMER",
      acceptedTerms: true
    };
    const token = jwt2.sign(tokenPayload, JWT_SECRET2, { expiresIn: "14d" });
    return res.status(201).json({
      token,
      user: tokenPayload,
      message: "Cuenta creada exitosamente. \xA1Bienvenido a Maracumango!"
    });
  }
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    let result;
    try {
      result = await query(
        `INSERT INTO users (id, first_name, last_name, email, password_hash, role_id, phone, default_address, accepted_terms, terms_accepted_at, is_active)
         VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', $6, $7, TRUE, CURRENT_TIMESTAMP, TRUE)
         RETURNING id, first_name AS "firstName", last_name AS "lastName", email, phone, default_address AS "defaultAddress", role_id AS "roleId", role_id AS role, accepted_terms AS "acceptedTerms"`,
        [userId, resolvedFirstName, lastName ? lastName.trim() : null, cleanEmail, passwordHash, cleanPhone, cleanAddress || null]
      );
    } catch (insertErr) {
      if (insertErr.code === "42703") {
        console.warn("\u26A0\uFE0F Columna faltante detectada al registrar. Aplicando parche estructural...");
        await patchMissingUserColumns();
        result = await query(
          `INSERT INTO users (id, first_name, last_name, email, password_hash, role_id, phone, default_address, accepted_terms, terms_accepted_at, is_active)
           VALUES ($1, $2, $3, $4, $5, 'CUSTOMER', $6, $7, TRUE, CURRENT_TIMESTAMP, TRUE)
           RETURNING id, first_name AS "firstName", last_name AS "lastName", email, phone, default_address AS "defaultAddress", role_id AS "roleId", role_id AS role, accepted_terms AS "acceptedTerms"`,
          [userId, resolvedFirstName, lastName ? lastName.trim() : null, cleanEmail, passwordHash, cleanPhone, cleanAddress || null]
        );
      } else {
        throw insertErr;
      }
    }
    const customerRow = result.rows[0];
    const customerPayload = {
      id: customerRow.id,
      name: `${customerRow.firstName} ${customerRow.lastName || ""}`.trim(),
      firstName: customerRow.firstName,
      lastName: customerRow.lastName,
      email: customerRow.email,
      phone: customerRow.phone || cleanPhone,
      defaultAddress: customerRow.defaultAddress || cleanAddress,
      role: "CUSTOMER",
      roleId: "CUSTOMER",
      branchId: null,
      acceptedTerms: true
    };
    const token = jwt2.sign(customerPayload, JWT_SECRET2, { expiresIn: "14d" });
    res.status(201).json({
      token,
      user: customerPayload,
      message: "Cuenta creada exitosamente. \xA1Bienvenido a Maracumango!"
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Ya existe una cuenta registrada con este correo electr\xF3nico." });
    }
    console.error("Error registrando cliente:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contrase\xF1a requeridos." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown_ip";
  const emailKey = normalizeIdentifier("login", cleanEmail);
  const ipKey = normalizeIdentifier("login_ip", clientIp);
  const emailLock = await checkSecurityLockout(emailKey);
  if (emailLock.isBlocked) {
    return res.status(429).json({
      error: emailLock.message,
      blocked: true,
      remainingMinutes: emailLock.remainingMinutes
    });
  }
  const ipLock = await checkSecurityLockout(ipKey);
  if (ipLock.isBlocked) {
    return res.status(429).json({
      error: ipLock.message,
      blocked: true,
      remainingMinutes: ipLock.remainingMinutes
    });
  }
  if (!isDatabaseConfigured()) {
    if (cleanEmail === "admin@maracumango.com" && password === "admin123") {
      await resetSecurityAttempts(emailKey);
      await resetSecurityAttempts(ipKey);
      const user = {
        id: "user-admin-1",
        name: "Administrador Maracumango",
        firstName: "Administrador",
        lastName: "Maracumango",
        email: "admin@maracumango.com",
        role: "ADMIN",
        roleId: "ADMIN",
        branchId: null,
        acceptedTerms: true
      };
      const token = jwt2.sign(user, JWT_SECRET2, { expiresIn: "7d" });
      return res.json({ token, user });
    }
    if (cleanEmail === "carlos@maracumango.com" && password === "worker123") {
      await resetSecurityAttempts(emailKey);
      await resetSecurityAttempts(ipKey);
      const user = {
        id: "user-worker-1",
        name: "Carlos G\xF3mez",
        firstName: "Carlos",
        lastName: "G\xF3mez",
        email: "carlos@maracumango.com",
        role: "WORKER",
        roleId: "WORKER",
        branchId: "sede-1",
        branchName: "Sede Parque del Amor y la Amistad",
        acceptedTerms: true
      };
      const token = jwt2.sign(user, JWT_SECRET2, { expiresIn: "7d" });
      return res.json({ token, user });
    }
    const devCust = devFallbackCustomers.find((c) => c.email === cleanEmail);
    if (devCust) {
      const isValid = await bcrypt.compare(password, devCust.passwordHash);
      if (isValid) {
        await resetSecurityAttempts(emailKey);
        await resetSecurityAttempts(ipKey);
        const tokenPayload = {
          id: devCust.id,
          name: devCust.name,
          firstName: devCust.firstName,
          lastName: devCust.lastName,
          email: devCust.email,
          phone: devCust.phone,
          defaultAddress: devCust.defaultAddress,
          role: "CUSTOMER",
          roleId: "CUSTOMER",
          acceptedTerms: true
        };
        const token = jwt2.sign(tokenPayload, JWT_SECRET2, { expiresIn: "14d" });
        return res.json({ token, user: tokenPayload, message: "Inicio de sesi\xF3n exitoso." });
      }
    }
    const failEmail = await recordFailedAttempt(emailKey);
    await recordFailedAttempt(ipKey);
    return res.status(failEmail.isBlocked ? 429 : 401).json({
      error: failEmail.message,
      blocked: failEmail.isBlocked,
      attemptsLeft: failEmail.attemptsLeft,
      remainingMinutes: failEmail.remainingMinutes
    });
  }
  try {
    let userRes;
    try {
      userRes = await query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.role_id, u.branch_id, u.is_active,
                COALESCE(u.phone, '') AS phone,
                COALESCE(u.default_address, '') AS default_address,
                COALESCE(u.accepted_terms, TRUE) AS accepted_terms,
                b.name AS branch_name
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE LOWER(u.email) = $1`,
        [cleanEmail]
      );
    } catch (queryErr) {
      if (queryErr.code === "42703") {
        console.warn("\u26A0\uFE0F Columna u.phone o u.default_address faltante. Parcheando esquema y reintentando login...");
        await patchMissingUserColumns();
        userRes = await query(
          `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.role_id, u.branch_id, u.is_active,
                  COALESCE(u.phone, '') AS phone,
                  COALESCE(u.default_address, '') AS default_address,
                  COALESCE(u.accepted_terms, TRUE) AS accepted_terms,
                  b.name AS branch_name
           FROM users u
           LEFT JOIN branches b ON b.id = u.branch_id
           WHERE LOWER(u.email) = $1`,
          [cleanEmail]
        );
      } else {
        throw queryErr;
      }
    }
    if (userRes.rows.length === 0) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 401).json({
        error: fail.message,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft,
        remainingMinutes: fail.remainingMinutes
      });
    }
    const userRow = userRes.rows[0];
    if (!userRow.is_active) {
      return res.status(403).json({ error: "Esta cuenta ha sido desactivada por la administraci\xF3n." });
    }
    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 401).json({
        error: fail.message,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft,
        remainingMinutes: fail.remainingMinutes
      });
    }
    await resetSecurityAttempts(emailKey);
    await resetSecurityAttempts(ipKey);
    const userPayload = {
      id: userRow.id,
      name: `${userRow.first_name} ${userRow.last_name || ""}`.trim(),
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      email: userRow.email,
      phone: userRow.phone || "",
      defaultAddress: userRow.default_address || "",
      role: userRow.role_id,
      roleId: userRow.role_id,
      branchId: userRow.branch_id,
      branchName: userRow.branch_name,
      acceptedTerms: userRow.accepted_terms ?? true
    };
    const token = jwt2.sign(userPayload, JWT_SECRET2, { expiresIn: userPayload.role === "CUSTOMER" ? "14d" : "7d" });
    res.json({
      token,
      user: userPayload,
      message: "Inicio de sesi\xF3n exitoso."
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email || !VALID_EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Por favor ingresa un correo electr\xF3nico v\xE1lido." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown_ip";
  const emailKey = normalizeIdentifier("reset", cleanEmail);
  const ipKey = normalizeIdentifier("reset_ip", clientIp);
  const emailLock = await checkSecurityLockout(emailKey);
  if (emailLock.isBlocked) {
    return res.status(429).json({
      error: emailLock.message,
      blocked: true,
      remainingMinutes: emailLock.remainingMinutes
    });
  }
  const ipLock = await checkSecurityLockout(ipKey);
  if (ipLock.isBlocked) {
    return res.status(429).json({
      error: ipLock.message,
      blocked: true,
      remainingMinutes: ipLock.remainingMinutes
    });
  }
  const code = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 15 * 60 * 1e3;
  const tokenId = `rst-${Date.now()}`;
  if (!isDatabaseConfigured()) {
    devFallbackResetTokens.push({
      id: tokenId,
      email: cleanEmail,
      code,
      expiresAt,
      used: false
    });
    const emailResult = await sendPasswordResetEmail(cleanEmail, code);
    return res.json({
      message: emailResult.sent ? "C\xF3digo de recuperaci\xF3n de 6 d\xEDgitos enviado exitosamente a tu correo electr\xF3nico. V\xE1lido por 15 minutos." : "C\xF3digo de recuperaci\xF3n de 6 d\xEDgitos generado exitosamente. V\xE1lido por 15 minutos.",
      emailSent: emailResult.sent,
      code,
      email: cleanEmail,
      expiresInMinutes: 15
    });
  }
  try {
    const userCheck = await query("SELECT id, first_name FROM users WHERE LOWER(email) = $1", [cleanEmail]);
    if (userCheck.rows.length === 0) {
      await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(404).json({
        error: "No se encontr\xF3 ninguna cuenta registrada con este correo electr\xF3nico."
      });
    }
    const user = userCheck.rows[0];
    await query("UPDATE password_reset_tokens SET used = TRUE WHERE LOWER(email) = $1", [cleanEmail]);
    await query(
      `INSERT INTO password_reset_tokens (id, user_id, email, code, expires_at, used)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [tokenId, user.id, cleanEmail, code, new Date(expiresAt).toISOString()]
    );
    const emailResult = await sendPasswordResetEmail(cleanEmail, code, user.first_name);
    res.json({
      message: emailResult.sent ? "C\xF3digo de recuperaci\xF3n de 6 d\xEDgitos enviado exitosamente a tu correo electr\xF3nico. V\xE1lido por 15 minutos." : "C\xF3digo de recuperaci\xF3n generado. No se detect\xF3 un servidor SMTP configurado en Vercel.",
      emailSent: emailResult.sent,
      code,
      email: cleanEmail,
      expiresInMinutes: 15
    });
  } catch (error) {
    console.error("Error generating reset code:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Correo, c\xF3digo de 6 d\xEDgitos y nueva contrase\xF1a son obligatorios." });
  }
  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = String(code).trim();
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown_ip";
  const emailKey = normalizeIdentifier("reset", cleanEmail);
  const ipKey = normalizeIdentifier("reset_ip", clientIp);
  const emailLock = await checkSecurityLockout(emailKey);
  if (emailLock.isBlocked) {
    return res.status(429).json({
      error: emailLock.message,
      blocked: true,
      remainingMinutes: emailLock.remainingMinutes
    });
  }
  const ipLock = await checkSecurityLockout(ipKey);
  if (ipLock.isBlocked) {
    return res.status(429).json({
      error: ipLock.message,
      blocked: true,
      remainingMinutes: ipLock.remainingMinutes
    });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "La nueva contrase\xF1a debe tener al menos 6 caracteres." });
  }
  if (!isDatabaseConfigured()) {
    const validToken = devFallbackResetTokens.find(
      (t) => t.email === cleanEmail && t.code === cleanCode && !t.used && t.expiresAt > Date.now()
    );
    if (!validToken) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 400).json({
        error: `C\xF3digo de recuperaci\xF3n incorrecto o vencido. ${fail.message}`,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft
      });
    }
    validToken.used = true;
    const newHash = await bcrypt.hash(newPassword, 10);
    const devCust = devFallbackCustomers.find((c) => c.email === cleanEmail);
    if (devCust) {
      devCust.passwordHash = newHash;
    }
    await resetSecurityAttempts(emailKey);
    await resetSecurityAttempts(ipKey);
    return res.json({ message: "Contrase\xF1a restablecida exitosamente. Ya puedes iniciar sesi\xF3n con tu nueva contrase\xF1a." });
  }
  try {
    const tokenRes = await query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE LOWER(email) = $1 AND code = $2 AND used = FALSE AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, cleanCode]
    );
    if (tokenRes.rows.length === 0) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 400).json({
        error: `C\xF3digo de verificaci\xF3n incorrecto o expirado. ${fail.message}`,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft,
        remainingMinutes: fail.remainingMinutes
      });
    }
    const tokenRow = tokenRes.rows[0];
    const newHash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, tokenRow.user_id]
    );
    await query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [tokenRow.id]);
    await resetSecurityAttempts(emailKey);
    await resetSecurityAttempts(ipKey);
    res.json({
      message: "\xA1Contrase\xF1a restablecida con \xE9xito! Ya puedes iniciar sesi\xF3n en Maracumango con tu nueva contrase\xF1a."
    });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.get("/me", (req, res) => {
  if (req.user) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ error: "No autenticado." });
});
router7.put("/profile", async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "No autenticado." });
  }
  const { name, firstName, lastName, phone, defaultAddress } = req.body;
  const resolvedFirstName = (firstName || name || "").trim() || req.user.firstName;
  const cleanPhone = phone !== void 0 ? String(phone).trim() : req.user.phone;
  const cleanAddress = defaultAddress !== void 0 ? String(defaultAddress).trim() : req.user.defaultAddress;
  if (!isDatabaseConfigured()) {
    const updated = {
      ...req.user,
      firstName: resolvedFirstName,
      name: resolvedFirstName,
      phone: cleanPhone,
      defaultAddress: cleanAddress
    };
    req.user = updated;
    const token = jwt2.sign(updated, JWT_SECRET2, { expiresIn: "14d" });
    return res.json({ user: updated, token, message: "Perfil actualizado correctamente." });
  }
  try {
    const result = await query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = CASE WHEN $2::varchar IS NOT NULL THEN $2 ELSE last_name END,
           phone = COALESCE($3, phone),
           default_address = COALESCE($4, default_address),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, first_name AS "firstName", last_name AS "lastName", email, phone, default_address AS "defaultAddress", role_id AS "roleId", role_id AS role, accepted_terms AS "acceptedTerms"`,
      [resolvedFirstName, lastName ? String(lastName).trim() : null, cleanPhone || null, cleanAddress || null, req.user.id]
    );
    const updatedRow = result.rows[0];
    const updatedPayload = {
      ...req.user,
      id: updatedRow.id,
      firstName: updatedRow.firstName,
      lastName: updatedRow.lastName,
      name: `${updatedRow.firstName} ${updatedRow.lastName || ""}`.trim(),
      email: updatedRow.email,
      phone: updatedRow.phone,
      defaultAddress: updatedRow.defaultAddress,
      role: updatedRow.role,
      roleId: updatedRow.roleId,
      acceptedTerms: updatedRow.acceptedTerms ?? true
    };
    const token = jwt2.sign(updatedPayload, JWT_SECRET2, { expiresIn: "14d" });
    res.json({ user: updatedPayload, token, message: "Perfil actualizado correctamente." });
  } catch (error) {
    console.error("Error actualizando perfil:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.get("/users", requireAdmin, async (_req, res) => {
  if (!isDatabaseConfigured()) {
    return res.json([
      { id: "user-admin-1", firstName: "Admin", lastName: "Principal", name: "Admin Principal", email: "admin@maracumango.com", role: "ADMIN", roleId: "ADMIN", branchId: null, active: true },
      { id: "user-worker-1", firstName: "Carlos", lastName: "G\xF3mez", name: "Carlos G\xF3mez", email: "carlos@maracumango.com", role: "WORKER", roleId: "WORKER", branchId: "sede-1", branchName: "Sede Parque del Amor y la Amistad", active: true },
      { id: "user-worker-2", firstName: "Laura", lastName: "Trujillo", name: "Laura Trujillo", email: "laura@maracumango.com", role: "WORKER", roleId: "WORKER", branchId: "sede-2", branchName: "Sede Sector Edsbur / \xDAnico", active: true }
    ]);
  }
  try {
    const result = await query(
      `SELECT u.id,
              u.first_name AS "firstName",
              u.last_name AS "lastName",
              TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) AS name,
              u.email,
              u.role_id AS "roleId",
              u.role_id AS role,
              u.branch_id AS "branchId",
              u.is_active AS active,
              b.name AS "branchName",
              u.created_at AS "createdAt"
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.role_id IN ('ADMIN', 'WORKER')
       ORDER BY u.role_id ASC, u.first_name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users from DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.post("/users", requireAdmin, async (req, res) => {
  const { firstName, lastName, email, password, roleId, role, branchId } = req.body;
  const targetRole = (roleId || role || "").toUpperCase();
  if (!firstName || !email || !password || !targetRole) {
    return res.status(400).json({ error: "Nombre, email, contrase\xF1a y rol son obligatorios." });
  }
  if (!VALID_EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Formato de correo electr\xF3nico inv\xE1lido." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contrase\xF1a debe tener al menos 6 caracteres." });
  }
  if (!["ADMIN", "WORKER"].includes(targetRole)) {
    return res.status(400).json({ error: "El rol debe ser ADMIN o WORKER." });
  }
  if (targetRole === "WORKER" && !branchId) {
    return res.status(400).json({ error: "Un trabajador debe tener asignada una sede operativa obligatoria." });
  }
  const finalBranchId = targetRole === "WORKER" ? branchId : branchId || null;
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Base de datos no configurada." });
  }
  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = `user-${Date.now()}`;
    const result = await query(
      `INSERT INTO users (id, first_name, last_name, email, password_hash, role_id, branch_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id, first_name AS "firstName", last_name AS "lastName", email, role_id AS "roleId", role_id AS role, branch_id AS "branchId", is_active AS active`,
      [userId, firstName.trim(), lastName ? lastName.trim() : null, email.toLowerCase().trim(), passwordHash, targetRole, finalBranchId]
    );
    res.status(201).json({
      ...result.rows[0],
      name: `${result.rows[0].firstName} ${result.rows[0].lastName || ""}`.trim()
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ error: "Ya existe un usuario registrado con ese correo electr\xF3nico." });
    }
    res.status(500).json({ error: error.message });
  }
});
router7.put("/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, roleId, role, branchId, active, newPassword } = req.body;
  if (id.startsWith("cust-")) {
    return res.status(400).json({ error: "No se pueden modificar cuentas de clientes desde la gesti\xF3n de personal." });
  }
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Base de datos no configurada." });
  }
  try {
    const currentRes = await query("SELECT id, role_id, email FROM users WHERE id = $1", [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    const currentTarget = currentRes.rows[0];
    if (currentTarget.role_id === "CUSTOMER") {
      return res.status(400).json({ error: "No se pueden modificar cuentas de clientes desde la gesti\xF3n de personal." });
    }
    let finalRole = currentTarget.role_id;
    if (roleId || role) {
      const specifiedRole = (roleId || role).toUpperCase();
      if (["ADMIN", "WORKER"].includes(specifiedRole)) {
        if (req.user?.id === id && specifiedRole !== "ADMIN") {
          return res.status(400).json({
            error: "No puedes quitarte a ti mismo los permisos de Administrador."
          });
        }
        finalRole = specifiedRole;
      }
    }
    let finalBranchId = branchId !== void 0 ? branchId : null;
    if (finalRole === "WORKER") {
      if (!finalBranchId) {
        return res.status(400).json({
          error: "Un trabajador debe tener asignada una sede operativa obligatoria."
        });
      }
    } else {
      if (!finalBranchId) {
        finalBranchId = null;
      }
    }
    let passwordClause = "";
    const params = [
      firstName ? firstName.trim() : null,
      lastName !== void 0 ? lastName ? lastName.trim() : null : null,
      finalRole,
      finalBranchId,
      active !== void 0 ? !!active : null,
      id
    ];
    if (newPassword && newPassword.length >= 6) {
      const hash = await bcrypt.hash(newPassword, 10);
      params.splice(5, 0, hash);
      passwordClause = `, password_hash = $${params.length - 1}`;
    }
    const result = await query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = CASE WHEN $2::varchar IS NOT NULL THEN $2 ELSE last_name END,
           role_id = $3,
           branch_id = $4,
           is_active = COALESCE($5, is_active)
           ${passwordClause},
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $${params.length}
       RETURNING id, first_name AS "firstName", last_name AS "lastName", email, role_id AS "roleId", role_id AS role, branch_id AS "branchId", is_active AS active`,
      params
    );
    const updatedUser = result.rows[0];
    res.json({
      ...updatedUser,
      name: `${updatedUser.firstName} ${updatedUser.lastName || ""}`.trim()
    });
  } catch (error) {
    console.error("Error updating user in DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
router7.delete("/users/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (req.user?.id === id) {
    return res.status(400).json({
      error: "No puedes eliminar tu propia cuenta de Administrador activa."
    });
  }
  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: "Base de datos no configurada." });
  }
  try {
    const userCheck = await query("SELECT id, email, role_id, first_name FROM users WHERE id = $1", [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }
    const targetUser = userCheck.rows[0];
    try {
      await query("DELETE FROM users WHERE id = $1", [id]);
      return res.json({
        message: `El usuario ${targetUser.first_name} (${targetUser.email}) fue eliminado permanentemente de la base de datos.`,
        deleted: true
      });
    } catch {
      await query("UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
      return res.json({
        message: `El usuario ${targetUser.first_name} fue desactivado debido a que tiene registros hist\xF3ricos asociados.`,
        deleted: true
      });
    }
  } catch (error) {
    console.error("Error deleting user in DB:", error.message);
    res.status(500).json({ error: error.message });
  }
});
var auth_default = router7;

// server/services/orderRetention.ts
async function runOrderRetentionCleanup() {
  if (!isDatabaseConfigured()) {
    return { cleanedCancelled: 0, cleanedDelivered: 0 };
  }
  try {
    const cancelledRes = await query(
      `DELETE FROM orders 
       WHERE (status_id = 'CANCELLED' OR status_id = 'Cancelado') 
         AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
       RETURNING id`
    );
    const deliveredRes = await query(
      `DELETE FROM orders 
       WHERE (status_id = 'DELIVERED' OR status_id = 'Entregado') 
         AND updated_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
       RETURNING id`
    );
    const cleanedCancelled = cancelledRes.rowCount || 0;
    const cleanedDelivered = deliveredRes.rowCount || 0;
    if (cleanedCancelled > 0 || cleanedDelivered > 0) {
      console.log(
        `\u{1F9F9} [Pol\xEDticas de Conservaci\xF3n]: Se depuraron ${cleanedCancelled} pedidos cancelados (>30 d\xEDas) y ${cleanedDelivered} pedidos entregados (>90 d\xEDas).`
      );
    }
    return { cleanedCancelled, cleanedDelivered };
  } catch (err) {
    console.error("\u26A0\uFE0F [Error en Retenci\xF3n de Pedidos]:", err.message);
    return { cleanedCancelled: 0, cleanedDelivered: 0 };
  }
}
function initOrderRetentionScheduler() {
  setTimeout(() => {
    runOrderRetentionCleanup();
  }, 5e3);
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1e3;
  setInterval(() => {
    runOrderRetentionCleanup();
  }, TWENTY_FOUR_HOURS_MS);
}

// server/index.ts
dotenv2.config();
var app = express();
var PORT = process.env.PORT || 3001;
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
var explicitOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()) : [];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (explicitOrigins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("Bloqueado por pol\xEDtica CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
if (!process.env.VERCEL) {
  initOrderRetentionScheduler();
}
app.use(authenticate);
var apiRouter = express.Router();
apiRouter.get("/health", async (_req, res) => {
  const dbConnected = isDatabaseConfigured();
  let dbCheck = false;
  if (dbConnected) {
    try {
      await query("SELECT 1");
      dbCheck = true;
    } catch {
      dbCheck = false;
    }
  }
  res.json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    database: {
      engine: "Neon PostgreSQL",
      configured: dbConnected,
      connected: dbCheck
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
apiRouter.use("/branches", branches_default);
apiRouter.use("/categories", categories_default);
apiRouter.use("/ingredients", ingredients_default);
apiRouter.use("/products", products_default);
apiRouter.use("/orders", orders_default);
apiRouter.use("/settings", settings_default);
apiRouter.use("/auth", auth_default);
app.use("/api", apiRouter);
app.use(apiRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Endpoint no encontrado" });
});
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`\u{1F96D} SERVIDOR BACKEND MARACUMANGO CORRIENDO`);
    console.log(`\u{1F4CD} URL: http://localhost:${PORT}`);
    console.log(`\u{1F5C4}\uFE0F Neon PostgreSQL: ${isDatabaseConfigured() ? "CONFIGURADO \u2705" : "PENDIENTE EN .env \u26A0\uFE0F"}`);
    console.log(`====================================================`);
  });
}
var index_default = app;
export {
  index_default as default
};
