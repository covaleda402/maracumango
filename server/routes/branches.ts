import { Router, type Request, type Response } from 'express';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { SEDES } from '../../src/data/sedes';

const router = Router();

// In-memory fallback for development/offline testing
const devFallbackBranches: any[] = [...SEDES];

// GET /api/branches — Get all active branches with shifts
router.get('/', async (_req: Request, res: Response) => {
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
       WHERE LOWER(b.name) NOT LIKE '%covaleda%' AND b.id != 'sede-1795151700722'
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
    const found = devFallbackBranches.find((s) => s.id === id);
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
  const { nombre, direccion, ciudad, whatsapp, phone, activa, is_active } = req.body;
  const targetActiva = activa !== undefined ? activa : is_active;

  if (!isDatabaseConfigured()) {
    const idx = devFallbackBranches.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Sede no encontrada' });
    }
    const resolvedActive = targetActiva !== undefined ? !!targetActiva : devFallbackBranches[idx].activa !== false;
    devFallbackBranches[idx] = {
      ...devFallbackBranches[idx],
      ...(nombre !== undefined && { nombre: String(nombre).trim() }),
      ...(direccion !== undefined && { direccion: String(direccion).trim() }),
      ...(ciudad !== undefined && { ciudad: String(ciudad).trim() }),
      ...(whatsapp !== undefined && { whatsapp: String(whatsapp).trim() }),
      ...(phone !== undefined && { phone: String(phone).trim() }),
      activa: resolvedActive,
      is_active: resolvedActive,
    };
    return res.json({
      ...devFallbackBranches[idx],
      branch: devFallbackBranches[idx],
      activa: resolvedActive,
      is_active: resolvedActive,
      message: 'Sede actualizada exitosamente (Modo local).',
    });
  }

  try {
    const cleanNombre = nombre !== undefined ? String(nombre).trim() : null;
    const cleanDireccion = direccion !== undefined ? String(direccion).trim() : null;
    const cleanCiudad = ciudad !== undefined ? String(ciudad).trim() : null;
    const cleanWhatsapp = whatsapp !== undefined ? String(whatsapp).trim() : null;
    const cleanPhone = phone !== undefined ? String(phone).trim() : cleanWhatsapp;
    const cleanActiva = targetActiva !== undefined ? !!targetActiva : null;

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

// POST /api/branches — Create a new branch (Admin only)
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { nombre, direccion, ciudad, whatsapp, phone, horario } = req.body;

  if (!nombre || !direccion || !whatsapp) {
    return res.status(400).json({ error: 'Nombre, dirección y WhatsApp son obligatorios para crear una sede.' });
  }

  const cleanNombre = String(nombre).trim();
  const cleanDireccion = String(direccion).trim();
  const cleanCiudad = ciudad ? String(ciudad).trim() : 'Neiva, Huila';
  const cleanWhatsapp = String(whatsapp).trim();
  const cleanPhone = phone ? String(phone).trim() : cleanWhatsapp;
  const cleanHorario = horario ? String(horario).trim() : 'Jornada Continua: 9:00 a.m. – 9:00 p.m.';

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
      shifts: [],
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

    // Create a default operational shift for the new branch
    const shiftId = `shift-${Date.now()}`;
    await query(
      `INSERT INTO shifts (id, branch_id, name, start_time, end_time, description, is_active)
       VALUES ($1, $2, $3, '09:00:00', '21:00:00', $4, TRUE)`,
      [shiftId, branchId, 'Jornada Comercial', cleanHorario]
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
          name: 'Jornada Comercial',
          startTime: '09:00:00',
          endTime: '21:00:00',
          description: cleanHorario,
          isActive: true,
        },
      ],
      message: 'Sede creada exitosamente.',
    });
  } catch (error: any) {
    console.error('Error creating branch in DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/branches/:id — Hard delete branch completely (Admin only)
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isDatabaseConfigured()) {
    const idx = devFallbackBranches.findIndex((s) => s.id === id);
    if (idx !== -1) {
      devFallbackBranches.splice(idx, 1);
    }
    return res.json({ message: 'Sede eliminada permanentemente del sistema.', success: true, deleted: true });
  }

  try {
    // 1. Unlink any users assigned to this branch
    await query("UPDATE users SET branch_id = 'sede-1' WHERE branch_id = $1", [id]);

    // 2. Reassign orders to sede-1 (preserves history without violating NOT NULL constraints)
    await query("UPDATE orders SET branch_id = 'sede-1' WHERE branch_id = $1", [id]);

    // 3. Remove operational shifts for this branch
    await query('DELETE FROM shifts WHERE branch_id = $1', [id]);

    // 4. Delete the branch record completely
    const result = await query('DELETE FROM branches WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sede no encontrada.' });
    }

    res.json({ message: 'Sede eliminada permanentemente del sistema.', success: true, deleted: true });
  } catch (error: any) {
    console.error('Error deleting branch:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
