import { Router, type Request, type Response } from 'express';
import { query, getClient, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { validateProductInput } from '../middleware/validate';
import { INITIAL_PRODUCTS, PRODUCT_INGREDIENTS } from '../../src/data/mockData';

const router = Router();

// Helper to format a single product row with ingredients safely
const formatProductRow = (p: any, categoryName?: string, ingredientsList?: string[]) => {
  let finalIngs: string[] = [];
  if (Array.isArray(ingredientsList)) {
    finalIngs = ingredientsList;
  } else if (Array.isArray(p.ingredients)) {
    finalIngs = p.ingredients;
  } else if (typeof p.ingredients === 'string') {
    try {
      const parsed = JSON.parse(p.ingredients);
      finalIngs = Array.isArray(parsed) ? parsed : [];
    } catch {
      finalIngs = [];
    }
  }

  return {
    id: String(p.id),
    name: String(p.name || ''),
    category: categoryName || p.category || 'Granizados',
    categoryId: p.category_id || p.categoryId || 'cat-1',
    price: typeof p.price === 'string' ? parseFloat(p.price) : Number(p.price || 0),
    description: p.description ? String(p.description) : '',
    image: p.image_url || p.image || '/images/granizado.png',
    popular: !!(p.is_popular ?? p.popular),
    active: p.is_active !== undefined ? !!p.is_active : (p.active !== undefined ? !!p.active : true),
    ingredients: finalIngs,
  };
};

// GET /api/products — Get all products (with ingredients list)
router.get('/', async (req: Request, res: Response) => {
  const activeOnly = req.query.activeOnly === 'true';

  if (!isDatabaseConfigured()) {
    const productsWithIngs = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      ingredients: PRODUCT_INGREDIENTS[p.id] || [],
    }));
    return res.json(activeOnly ? productsWithIngs.filter((p) => p.active) : productsWithIngs);
  }

  try {
    const whereClause = activeOnly ? 'WHERE p.is_active = TRUE' : '';
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
  } catch (error: any) {
    console.error('Error fetching products from DB:', error.message);
    const productsWithIngs = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      ingredients: PRODUCT_INGREDIENTS[p.id] || [],
    }));
    res.json(activeOnly ? productsWithIngs.filter((p) => p.active) : productsWithIngs);
  }
});

// Helper to resolve category ID from either categoryId or category name
async function resolveCategoryId(client: any, categoryId?: string, categoryName?: string): Promise<string> {
  if (categoryId) {
    const res = await client.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (res.rows.length > 0) return res.rows[0].id;
  }
  if (categoryName) {
    const res = await client.query(
      'SELECT id FROM categories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR id = $1 LIMIT 1',
      [categoryName]
    );
    if (res.rows.length > 0) return res.rows[0].id;
  }
  // Default fallback to first active category
  const firstCat = await client.query('SELECT id FROM categories ORDER BY sort_order ASC LIMIT 1');
  return firstCat.rows[0]?.id || 'cat-1';
}

// POST /api/products — Create product (Admin only)
router.post('/', requireAdmin, validateProductInput, async (req: Request, res: Response) => {
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
    ingredients,
  } = req.body;

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const resolvedCatId = await resolveCategoryId(client, categoryId, category);
    const finalImage = imageUrl || image || '/images/granizado.png';
    const finalPopular = isPopular !== undefined ? !!isPopular : (popular !== undefined ? !!popular : false);
    const finalActive = isActive !== undefined ? !!isActive : (active !== undefined ? !!active : true);
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
        finalActive,
      ]
    );

    // Save ingredients if provided as string names or IDs
    const finalIngNames: string[] = [];
    if (Array.isArray(ingredients) && ingredients.length > 0) {
      for (let i = 0; i < ingredients.length; i++) {
        const ingName = String(ingredients[i]).trim();
        if (!ingName) continue;
        finalIngNames.push(ingName);
        // Find or create ingredient
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

    // Get category name
    const catRes = await client.query('SELECT name FROM categories WHERE id = $1', [resolvedCatId]);
    const catName = catRes.rows[0]?.name || 'Categoría';

    await client.query('COMMIT');

    const created = formatProductRow(insertResult.rows[0], catName, finalIngNames);
    res.status(201).json(created);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating product in DB:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PUT /api/products/:id — Update product (Admin only)
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
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
    ingredients,
  } = req.body;

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    let resolvedCatId: string | null = null;
    if (categoryId || category) {
      resolvedCatId = await resolveCategoryId(client, categoryId, category);
    }

    const finalImage = imageUrl !== undefined ? imageUrl : image;
    const finalPopular = isPopular !== undefined ? isPopular : popular;
    const finalActive = isActive !== undefined ? isActive : active;
    const finalPrice = price !== undefined ? Number(price) : undefined;

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
        description !== undefined ? description?.trim() : null,
        finalImage,
        finalPopular !== undefined ? !!finalPopular : null,
        finalActive !== undefined ? !!finalActive : null,
        id,
      ]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const finalIngNames: string[] = [];
    if (Array.isArray(ingredients)) {
      await client.query('DELETE FROM product_ingredients WHERE product_id = $1', [id]);
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
      await client.query('DELETE FROM product_ingredients WHERE product_id = $1', [id]);
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
    const catRes = await client.query('SELECT name FROM categories WHERE id = $1', [row.category_id]);
    const catName = catRes.rows[0]?.name || 'Categoría';

    await client.query('COMMIT');

    const updated = formatProductRow(row, catName, finalIngNames.length > 0 ? finalIngNames : undefined);
    res.json(updated);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating product in DB:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PATCH /api/products/:id/toggle — Toggle active state (Admin only)
router.patch('/:id/toggle', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
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
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id — Safe delete or deactivate product (Admin only)
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
  }

  try {
    // 1. Verify product exists
    const prodCheck = await query('SELECT id, name FROM products WHERE id = $1', [id]);
    if (prodCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    const prodName = prodCheck.rows[0].name;

    // 2. Check if product has historical orders
    const historyCheck = await query(
      'SELECT count(*) FROM order_items WHERE product_id = $1',
      [id]
    );
    const orderCount = parseInt(historyCheck.rows[0].count, 10);

    if (orderCount > 0) {
      // Deactivate to protect financial and sales audit records
      await query(
        'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
      return res.json({
        deleted: false,
        message: `El producto "${prodName}" cuenta con ${orderCount} registro(s) en el historial de pedidos. Ha sido desactivado del catálogo para preservar los registros contables.`,
        active: false,
      });
    }

    // 3. If no order history exists, physically delete product and its ingredient relations
    await query('DELETE FROM product_ingredients WHERE product_id = $1', [id]);
    await query('DELETE FROM products WHERE id = $1', [id]);

    res.json({
      deleted: true,
      message: `Producto "${prodName}" eliminado permanentemente de la base de datos.`,
    });
  } catch (error: any) {
    console.error('Error deleting product from DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
