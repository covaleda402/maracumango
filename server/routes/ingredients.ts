import { Router, type Request, type Response } from 'express';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// GET /api/ingredients — List all ingredients
router.get('/', async (_req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    return res.json([
      { id: 'ing-1', name: 'Hielo frapeado', active: true },
      { id: 'ing-2', name: 'Pulpa de maracuyá', active: true },
      { id: 'ing-3', name: 'Pulpa de mango biche', active: true },
      { id: 'ing-4', name: 'Escarchado de tajín', active: true },
      { id: 'ing-5', name: 'Leche condensada', active: true },
      { id: 'ing-6', name: 'Gomitas tricolores', active: true },
      { id: 'ing-7', name: 'Zumo de limón fresco', active: true },
      { id: 'ing-8', name: 'Sal marina', active: true },
      { id: 'ing-9', name: 'Chamoy artesanal', active: true },
    ]);
  }

  try {
    const result = await query(
      'SELECT id, name, description, is_active FROM ingredients WHERE is_active = TRUE ORDER BY name ASC'
    );
    res.json(result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      active: r.is_active,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ingredients — Add ingredient (Admin only)
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre del ingrediente es obligatorio.' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
  }

  try {
    const id = `ing-${Date.now()}`;
    const result = await query(
      'INSERT INTO ingredients (id, name, description, is_active) VALUES ($1, $2, $3, TRUE) RETURNING *',
      [id, name.trim(), description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
