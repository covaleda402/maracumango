import { Router, type Request, type Response } from 'express';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { INITIAL_CATEGORIES } from '../../src/services/storageService';

const router = Router();

let devFallbackCategories: any[] = [...INITIAL_CATEGORIES];

const formatCategory = (c: any) => ({
  id: c.id,
  name: c.name,
  description: c.description || '',
  order: c.sort_order ?? c.order ?? 0,
  active: c.is_active ?? c.active ?? true,
});

// GET /api/categories
router.get('/', async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === 'true';

  if (!isDatabaseConfigured()) {
    return res.json(activeOnly ? devFallbackCategories.filter((c) => c.active) : devFallbackCategories);
  }

  try {
    const whereClause = activeOnly ? 'WHERE is_active = TRUE' : '';
    const result = await query(
      `SELECT id, name, description, sort_order, is_active 
       FROM categories 
       ${whereClause}
       ORDER BY sort_order ASC, name ASC`
    );
    res.json(result.rows.map(formatCategory));
  } catch (error: any) {
    console.error('Error fetching categories from DB:', error.message);
    res.json(activeOnly ? INITIAL_CATEGORIES.filter((c) => c.active) : INITIAL_CATEGORIES);
  }
});

// POST /api/categories (Admin only)
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  const { name, description, order } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
  }

  if (!isDatabaseConfigured()) {
    const newCat = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      description: description ? description.trim() : '',
      order: order || 0,
      active: true,
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
  } catch (error: any) {
    console.error('Error creating category in DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/categories/:id (Admin only)
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, order, active } = req.body;

  if (!isDatabaseConfigured()) {
    const idx = devFallbackCategories.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }
    devFallbackCategories[idx] = {
      ...devFallbackCategories[idx],
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: String(description).trim() }),
      ...(order !== undefined && { order: Number(order) }),
      ...(active !== undefined && { active: !!active }),
    };
    return res.json(devFallbackCategories[idx]);
  }

  try {
    const cleanName = name !== undefined && name !== null ? String(name).trim() : null;
    const cleanDesc = description !== undefined && description !== null ? String(description).trim() : null;
    const cleanOrder = order !== undefined && order !== null ? Number(order) : null;
    const cleanActive = active !== undefined && active !== null ? !!active : null;

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
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }
    res.json(formatCategory(result.rows[0]));
  } catch (error: any) {
    console.error('Error updating category in DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/categories/:id (Admin only — safely verifies associated products)
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isDatabaseConfigured()) {
    const idx = devFallbackCategories.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }
    const catName = devFallbackCategories[idx].name;
    devFallbackCategories.splice(idx, 1);
    return res.json({ message: `Categoría "${catName}" eliminada exitosamente.` });
  }

  try {
    // 1. Check if category exists
    const catCheck = await query('SELECT id, name FROM categories WHERE id = $1', [id]);
    if (catCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }
    const catName = catCheck.rows[0].name;

    // 2. Check if there are associated products in the database
    const prodCountRes = await query(
      'SELECT count(*) FROM products WHERE category_id = $1',
      [id]
    );
    const prodCount = parseInt(prodCountRes.rows[0].count, 10);

    if (prodCount > 0) {
      return res.status(400).json({
        error: `No es posible eliminar la categoría "${catName}" porque tiene ${prodCount} producto(s) asociado(s). Reasigna o elimina los productos primero para mantener la integridad del catálogo.`,
      });
    }

    // 3. Delete category safely and permanently from Neon PostgreSQL
    await query('DELETE FROM categories WHERE id = $1', [id]);

    res.json({ message: `Categoría "${catName}" eliminada exitosamente.` });
  } catch (error: any) {
    console.error('Error deleting category from DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
