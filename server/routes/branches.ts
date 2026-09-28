import { Router, type Request, type Response } from 'express';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { SEDES } from '../../src/data/sedes';

const router = Router();

// GET /api/branches — Get all active branches with shifts
router.get('/', async (_req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    return res.json(SEDES);
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
      horario: row.shifts && row.shifts.length > 0
        ? row.shifts.map((s: any) => `${s.name}: ${String(s.startTime).slice(0, 5)} – ${String(s.endTime).slice(0, 5)}`).join(' | ')
        : 'Horario comercial',
      shiftInfo: row.shifts && row.shifts.length > 0
        ? `Turno Activo: ${row.shifts[0].name} (${String(row.shifts[0].startTime).slice(0, 5)} – ${String(row.shifts[0].endTime).slice(0, 5)})`
        : 'Turno activo',
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching branches from DB:', error.message);
    res.json(SEDES);
  }
});

// GET /api/branches/:id — Get single branch
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!isDatabaseConfigured()) {
    const found = SEDES.find((s) => s.id === id);
    return found ? res.json(found) : res.status(404).json({ error: 'Sede no encontrada' });
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
      return res.status(404).json({ error: 'Sede no encontrada' });
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
      horario: b.shifts && b.shifts.length > 0
        ? b.shifts.map((s: any) => `${s.name}: ${String(s.startTime).slice(0, 5)} – ${String(s.endTime).slice(0, 5)}`).join(' | ')
        : 'Horario comercial',
      shiftInfo: b.shifts && b.shifts.length > 0
        ? `Turno Activo: ${b.shifts[0].name} (${String(b.shifts[0].startTime).slice(0, 5)} – ${String(b.shifts[0].endTime).slice(0, 5)})`
        : 'Turno activo',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/branches/:id — Update branch (Admin only)
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nombre, direccion, ciudad, whatsapp, phone, activa } = req.body;

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos Neon no configurada.' });
  }

  try {
    const cleanNombre = nombre !== undefined ? String(nombre).trim() : null;
    const cleanDireccion = direccion !== undefined ? String(direccion).trim() : null;
    const cleanCiudad = ciudad !== undefined ? String(ciudad).trim() : null;
    const cleanWhatsapp = whatsapp !== undefined ? String(whatsapp).trim() : null;
    const cleanPhone = phone !== undefined ? String(phone).trim() : cleanWhatsapp;
    const cleanActiva = activa !== undefined ? !!activa : null;

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
      return res.status(404).json({ error: 'Sede no encontrada' });
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
      message: 'Sede actualizada exitosamente en base de datos.',
    });
  } catch (error: any) {
    console.error('Error updating branch in DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
