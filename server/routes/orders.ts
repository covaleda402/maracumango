import { Router, type Request, type Response } from 'express';
import { query, getClient, isDatabaseConfigured } from '../db';
import { validateCustomerOrder } from '../middleware/validate';
import { requireAdmin, requireWorkerOrAdmin } from '../middleware/auth';
import { INITIAL_ORDERS } from '../../src/data/mockData';

const router = Router();

// In-memory fallback orders for development/testing when database is offline
const devFallbackOrders: any[] = [...INITIAL_ORDERS];

// GET /api/orders — List orders according to role and branch scope (Enforces Strict RBAC & Isolation)
router.get('/', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Sesión requerida. Debes iniciar sesión para consultar los pedidos.',
    });
  }

  const role = req.user.role.toLowerCase();
  const workerBranchId = req.user.branchId;
  const filterBranchId = req.query.branchId as string;

  if (!isDatabaseConfigured()) {
    let orders = [...devFallbackOrders];
    if (role === 'worker') {
      const activeBranch = workerBranchId || 'sede-1';
      orders = orders.filter((o) => o.sedeId === activeBranch && (o.status as string) !== 'PENDING_ADMIN' && (o.status as string) !== 'CANCELLED');
    } else if (role === 'customer') {
      orders = orders.filter(
        (o) =>
          (Boolean(o.customerId) && o.customerId === req.user?.id) ||
          (Boolean(o.customerEmail) && o.customerEmail?.toLowerCase() === req.user?.email?.toLowerCase())
      );
    } else if (role === 'admin') {
      if (filterBranchId && filterBranchId !== 'all') {
        orders = orders.filter((o) => o.sedeId === filterBranchId);
      }
    } else {
      return res.status(403).json({ error: 'Acceso no autorizado.' });
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

    const conditions: string[] = [];
    const params: any[] = [];

    // RBAC STRICT ENFORCEMENT:
    if (role === 'worker') {
      // 1. Worker can ONLY see orders for their assigned branch.
      // 2. Worker CANNOT see orders in 'PENDING_ADMIN' status (admin must accept first).
      // 3. Worker CANNOT see cancelled orders.
      const branch = workerBranchId || 'sede-1';
      params.push(branch);
      conditions.push(`o.branch_id = $${params.length}`);
      conditions.push(`o.status_id NOT IN ('PENDING_ADMIN', 'CANCELLED', 'Cancelado')`);
    } else if (role === 'customer') {
      // Customer can ONLY see their own orders (BOLA/IDOR protection)
      params.push(req.user.id);
      params.push(req.user.email);
      conditions.push(`(o.customer_id = $${params.length - 1} OR o.customer_email = $${params.length})`);
    } else if (role === 'admin') {
      // Admin can filter by branch or see all
      if (filterBranchId && filterBranchId !== 'all') {
        params.push(filterBranchId);
        conditions.push(`o.branch_id = $${params.length}`);
      }
    } else {
      return res.status(403).json({ error: 'Rol no autorizado.' });
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` GROUP BY o.id, b.name, os.id, os.name, os.label ORDER BY o.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching orders from DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Handlers for CSV export (Supports both /export-csv and /export/csv)
const handleExportCsv = async (req: Request, res: Response) => {
  const escapeCsv = (str: any) => {
    const val = str === null || str === undefined ? '' : String(str);
    return `"${val.replace(/"/g, '""')}"`;
  };

  const header = [
    'Numero Pedido',
    'Fecha y Hora',
    'Sede',
    'Cliente',
    'Telefono',
    'Tipo Entrega',
    'Direccion',
    'Metodo Pago',
    'Subtotal (COP)',
    'Tarifa Domicilio (COP)',
    'Total (COP)',
    'Estado',
    'Aprobado Por',
    'Preparado Por',
    'Detalle Productos',
  ];

  if (!isDatabaseConfigured()) {
    const csvRows = [header.map(escapeCsv).join(',')];
    for (const r of devFallbackOrders) {
      csvRows.push([
        escapeCsv(r.orderNumber),
        escapeCsv(new Date(r.createdAt || Date.now()).toLocaleString('es-CO')),
        escapeCsv(r.sedeNombre || 'Sede Principal'),
        escapeCsv(r.customerName),
        escapeCsv(r.customerPhone),
        escapeCsv(r.deliveryMethod),
        escapeCsv(r.deliveryAddress || 'En tienda'),
        escapeCsv(r.paymentMethod),
        r.subtotal,
        r.deliveryFee || 0,
        r.total,
        escapeCsv(r.status),
        escapeCsv(r.acceptedBy || 'N/A'),
        escapeCsv(r.preparedByName || 'N/A'),
        escapeCsv((r.items || []).map((it: any) => `${it.productName} (${it.quantity}x)`).join(', ')),
      ].join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_ventas_maracumango_${Date.now()}.csv"`
    );
    return res.send(csvContent);
  }

  try {
    const branchFilter = req.query.branchId as string;
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

    const params: any[] = [];
    if (branchFilter && branchFilter !== 'all') {
      params.push(branchFilter);
      sql += ` AND o.branch_id = $1`;
    }

    sql += `
      GROUP BY o.id, b.name, os.label, u_acc.first_name, u_acc.last_name
      ORDER BY o.created_at DESC
    `;

    const result = await query(sql, params);

    const csvRows = [header.map(escapeCsv).join(',')];

    for (const r of result.rows) {
      const dateStr = new Date(r.created_at).toLocaleString('es-CO');
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
        escapeCsv(r.productos),
      ].join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte_ventas_maracumango_${Date.now()}.csv"`
    );
    res.send(csvContent);
  } catch (error: any) {
    console.error('Error generating CSV export:', error.message);
    res.status(500).json({ error: error.message });
  }
};

router.get('/export-csv', requireAdmin, handleExportCsv);
router.get('/export/csv', requireAdmin, handleExportCsv);

// POST /api/orders — Customer creates a new order (status starts in PENDING_ADMIN, requires login)
router.post('/', validateCustomerOrder, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Debes iniciar sesión o crear una cuenta para poder realizar tu pedido.',
      requiresAuth: true,
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
    items,
  } = req.body;

  const targetSedeId = sedeId || 'sede-1';
  const finalCustomerName = (customerName || req.user.name || req.user.firstName || 'Cliente').trim();
  const finalCustomerPhone = (customerPhone || req.user.phone || '').trim();
  const customerId = req.user.id;
  const customerEmail = req.user.email;

  if (!isDatabaseConfigured()) {
    const nextNum = 100 + Math.floor(Math.random() * 900);
    const subtotal = items.reduce((sum: number, it: any) => sum + (it.unitPrice || 14000) * it.quantity, 0);
    const total = subtotal + Number(deliveryFee);

    const fallbackOrder = {
      id: `ord-${Date.now()}`,
      orderNumber: `#MMC-${nextNum}`,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerId,
      customerEmail,
      sedeId: targetSedeId,
      sedeNombre: targetSedeId === 'sede-2' ? 'Sede Sector Edsbur / Único' : 'Sede Parque del Amor y la Amistad',
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'domicilio' ? deliveryAddress?.trim() : undefined,
      paymentMethod,
      items: items.map((it: any) => ({
        productId: it.productId,
        productName: it.productName || 'Producto',
        unitPrice: it.unitPrice || 14000,
        quantity: it.quantity,
        ingredients: it.ingredients || ['Ingredientes seleccionados'],
        notes: it.notes,
      })),
      subtotal,
      deliveryFee: Number(deliveryFee),
      total,
      status: 'PENDING_ADMIN',
      statusLabel: 'Pendiente de Aprobación Admin',
      createdAt: new Date().toISOString(),
      notes: notes ? notes.trim() : undefined,
    };
    devFallbackOrders.unshift(fallbackOrder);
    return res.status(201).json(fallbackOrder);
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch current products to guarantee real prices from DB (Point 15: tamper protection)
    const productIds = items.map((i: any) => i.productId);
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
    const validatedItems = items.map((item: any) => {
      const prod = productMap.get(item.productId);
      const unitPrice = prod ? Number(prod.price) : Number(item.unitPrice || 0);
      const itemSubtotal = unitPrice * item.quantity;
      calculatedSubtotal += itemSubtotal;

      return {
        productId: item.productId,
        productName: prod ? prod.name : item.productName || 'Producto',
        unitPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        notes: item.notes || null,
        ingredientsSnapshot: prod ? prod.ingredients : item.ingredients || [],
      };
    });

    const fee = Number(deliveryFee) || 0;
    const calculatedTotal = calculatedSubtotal + fee;

    // 2. Generate sequential order number
    const countRes = await client.query('SELECT COUNT(*) FROM orders');
    const orderSequence = 100 + Number(countRes.rows[0].count) + 1;
    const orderNumber = `#MMC-${orderSequence}`;
    const orderId = `ord-${Date.now()}`;

    // 3. Insert order strictly in PENDING_ADMIN state with registered customer tracking
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
        deliveryMethod === 'domicilio' ? deliveryAddress?.trim() : null,
        fee,
        paymentMethod,
        calculatedSubtotal,
        calculatedTotal,
        notes ? notes.trim() : null,
      ]
    );

    // 4. Insert order items with exact historical snapshot
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
          JSON.stringify(it.ingredientsSnapshot),
        ]
      );
    }

    await client.query('COMMIT');

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
      status: 'PENDING_ADMIN',
      statusLabel: 'Pendiente de Aprobación Admin',
      notes: created.notes,
      items: validatedItems,
      createdAt: created.created_at,
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating order in DB:', error.message);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/accept — Admin approves order (Single click flow: PENDING_ADMIN -> ACCEPTED)
router.patch('/:id/accept', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || 'user-admin-1';

  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    found.status = 'ACCEPTED';
    found.statusLabel = 'Aceptado por Admin';
    found.acceptedBy = adminId;
    found.acceptedAt = new Date().toISOString();
    return res.json({ id, status: 'ACCEPTED', statusLabel: 'Aceptado por Admin', order: found });
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
        error: 'El pedido no se encuentra pendiente de aprobación o ya fue aceptado/cancelado.',
      });
    }

    res.json({
      message: 'Pedido aprobado exitosamente por administración. Disponible en la estación de barra para preparación.',
      status: 'ACCEPTED',
      order: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/confirm — Alias for accept
router.patch('/:id/confirm', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.id || 'user-admin-1';

  if (!isDatabaseConfigured()) {
    return res.json({ id, status: 'ACCEPTED', statusLabel: 'Aceptado por Admin' });
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
        error: 'El pedido no se encuentra pendiente o ya fue aceptado/cancelado.',
      });
    }

    res.json({
      message: 'Pedido confirmado exitosamente.',
      status: 'ACCEPTED',
      order: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/start-preparation — Worker claims & starts preparing the order (Points 11 & 12)
// Atomic race condition protection: Only one worker can claim the order!
router.patch('/:id/start-preparation', requireWorkerOrAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = req.user;
  const workerId = user?.id || 'user-worker-1';
  const workerName = user ? (user.firstName + (user.lastName ? ' ' + user.lastName : '')) : 'Trabajador de Barra';
  const userBranch = user?.branchId;

  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    if (user?.role === 'WORKER' && userBranch && found.sedeId !== userBranch) {
      return res.status(403).json({ error: 'No puedes tomar pedidos asignados a otra sede operativa.' });
    }
    if (found.status !== 'ACCEPTED') {
      return res.status(400).json({ error: 'El pedido no está disponible para preparación.' });
    }
    found.status = 'PREPARING';
    found.statusLabel = 'En preparación';
    found.preparedBy = workerId;
    found.preparedByName = workerName;
    found.preparedAt = new Date().toISOString();
    return res.json({
      id,
      status: 'PREPARING',
      preparedBy: workerId,
      preparedByName: workerName,
      order: found,
    });
  }

  try {
    // 1. Check branch scope if user is worker
    if (user?.role === 'WORKER' && userBranch) {
      const branchCheck = await query('SELECT branch_id FROM orders WHERE id = $1', [id]);
      if (branchCheck.rows.length > 0 && branchCheck.rows[0].branch_id !== userBranch) {
        return res.status(403).json({
          error: 'No puedes tomar pedidos asignados a otra sede operativa.',
        });
      }
    }

    // 2. Atomic claim update
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

    // 3. If update returned 0 rows, determine why and return appropriate status
    if (result.rows.length === 0) {
      const current = await query(
        'SELECT status_id, prepared_by, prepared_by_name FROM orders WHERE id = $1',
        [id]
      );
      if (current.rows.length === 0) {
        return res.status(404).json({ error: 'Pedido no encontrado.' });
      }

      const row = current.rows[0];
      if (row.prepared_by || row.status_id === 'PREPARING') {
        return res.status(409).json({
          error: `Este pedido ya fue tomado previamente por ${row.prepared_by_name || 'otro trabajador'}.`,
          preparedBy: row.prepared_by,
          preparedByName: row.prepared_by_name,
        });
      }

      if (row.status_id === 'CANCELLED' || row.status_id === 'Cancelado') {
        return res.status(400).json({ error: 'Este pedido fue cancelado y no puede ser preparado.' });
      }

      if (row.status_id === 'DELIVERED' || row.status_id === 'READY') {
        return res.status(400).json({ error: 'Este pedido ya completó su etapa de preparación.' });
      }

      if (row.status_id === 'PENDING_ADMIN') {
        return res.status(400).json({
          error: 'El pedido aún está pendiente de aprobación por el administrador.',
        });
      }

      return res.status(400).json({ error: 'El pedido no está disponible para preparación.' });
    }

    res.json({
      message: `¡Pedido tomado exitosamente por ${workerName}! En preparación.`,
      order: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/status — Progress order status (Strict validation: Points 13, 14, 15)
router.patch('/:id/status', requireWorkerOrAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = req.user;
  const isWorker = user?.role === 'WORKER';

  const STATUS_MAP: Record<string, string> = {
    'Pendiente': 'PENDING_ADMIN',
    'Pendiente Admin': 'PENDING_ADMIN',
    'PENDING_ADMIN': 'PENDING_ADMIN',
    'Aceptado': 'ACCEPTED',
    'ACCEPTED': 'ACCEPTED',
    'En preparación': 'PREPARING',
    'PREPARING': 'PREPARING',
    'Listo': 'READY',
    'READY': 'READY',
    'Entregado': 'DELIVERED',
    'DELIVERED': 'DELIVERED',
    'Cancelado': 'CANCELLED',
    'CANCELLED': 'CANCELLED',
  };

  const targetStatusId = STATUS_MAP[status];
  if (!targetStatusId) {
    return res.status(400).json({ error: 'Estado de pedido inválido.' });
  }

  // Point 13: Worker CANNOT cancel orders via status update
  if (isWorker && targetStatusId === 'CANCELLED') {
    return res.status(403).json({
      error: 'Los trabajadores no tienen autorización para cancelar pedidos. Comunícate con administración.',
    });
  }

  // Point 10 & 14: Worker cannot manually accept pending orders
  if (isWorker && targetStatusId === 'ACCEPTED') {
    return res.status(403).json({
      error: 'Solo el administrador puede aprobar pedidos pendientes.',
    });
  }

  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    if (found.status === 'DELIVERED') {
      return res.status(400).json({
        error: 'El pedido ya fue entregado y su registro es definitivo. No se pueden alterar estados de pedidos entregados.',
      });
    }
    if (isWorker && found.status === 'READY' && (targetStatusId === 'PREPARING' || targetStatusId === 'ACCEPTED')) {
      return res.status(400).json({
        error: 'No está permitido revertir pedidos que ya están marcados como listos.',
      });
    }
    // Worker exclusivity: only the worker who claimed the order can mark it as ready
    if (isWorker && targetStatusId === 'READY' && found.preparedBy && found.preparedBy !== user?.id) {
      return res.status(403).json({
        error: `Solo el colaborador que inició la preparación (${found.preparedByName || 'otro trabajador'}) puede marcar este pedido como listo.`,
      });
    }
    found.status = targetStatusId;
    found.statusLabel = targetStatusId === 'READY' ? 'Listo' : targetStatusId === 'DELIVERED' ? 'Entregado' : targetStatusId;
    return res.json({ id, status: targetStatusId, order: found });
  }

  try {
    // 1. Fetch current status of order
    const orderCheck = await query('SELECT status_id, branch_id, prepared_by, prepared_by_name FROM orders WHERE id = $1', [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    const currentStatus = orderCheck.rows[0].status_id;

    // Point 13: Delivered orders CANNOT be altered by anyone
    if (currentStatus === 'DELIVERED') {
      return res.status(400).json({
        error: 'El pedido ya fue entregado y su registro es definitivo. No se pueden alterar estados de pedidos entregados.',
      });
    }

    // Point 13: Worker cannot revert status backwards
    if (isWorker) {
      if (currentStatus === 'READY' && targetStatusId === 'PREPARING') {
        return res.status(400).json({
          error: 'No está permitido revertir pedidos que ya están marcados como listos.',
        });
      }
      if (currentStatus === 'READY' && targetStatusId === 'ACCEPTED') {
        return res.status(400).json({
          error: 'Operación no permitida.',
        });
      }
      // Worker exclusivity: only the worker who claimed the order can mark it as ready
      if (targetStatusId === 'READY') {
        const preparerId = orderCheck.rows[0].prepared_by;
        const preparerName = orderCheck.rows[0].prepared_by_name;
        if (preparerId && preparerId !== user?.id) {
          return res.status(403).json({
            error: `Solo el colaborador que inició la preparación (${preparerName || 'otro trabajador'}) puede marcar este pedido como listo.`,
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
      message: 'Estado de pedido actualizado exitosamente.',
      order: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/cancel — Admin ONLY cancels order (Point 13 & 14)
router.patch('/:id/cancel', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  if (!isDatabaseConfigured()) {
    const found = devFallbackOrders.find((o) => o.id === id);
    if (found) {
      if (found.status === 'DELIVERED') {
        return res.status(400).json({
          error: 'No es posible cancelar un pedido que ya fue entregado al cliente.',
        });
      }
      found.status = 'CANCELLED';
      found.statusLabel = 'Cancelado';
      if (reason) {
        found.notes = (found.notes ? found.notes + ' | ' : '') + `Cancelación: ${reason}`;
      }
    }
    return res.json({ id, status: 'CANCELLED', statusLabel: 'Cancelado', order: found });
  }

  try {
    // Check if order is already delivered (delivered orders can NEVER be cancelled)
    const check = await query('SELECT status_id FROM orders WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado.' });
    }
    if (check.rows[0].status_id === 'DELIVERED') {
      return res.status(400).json({
        error: 'No es posible cancelar un pedido que ya fue entregado al cliente.',
      });
    }

    const notesAppend = reason ? ` | Cancelación: ${reason}` : '';
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
      message: 'Pedido cancelado exitosamente por administración.',
      order: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
