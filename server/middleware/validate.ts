import type { Request, Response, NextFunction } from 'express';

/**
 * Validations strictly required by Maracumango requirements:
 * 1. Indicaciones: no permitir números.
 * 2. Nombre: no permitir números.
 * 3. Teléfono: no permitir letras.
 * 4. Precios: positivo.
 * 5. Cantidades: enteras positivas.
 * 6. Email: formato válido.
 */

// Regex to ensure NO numbers in text
export const NO_NUMBERS_REGEX = /^[^0-9]*$/;

// Regex for clean name (only letters, accents, spaces, hyphens, and apostrophes)
export const VALID_NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/;

// Regex for telephone (only numbers, optional +, spaces, dashes, parentheses)
export const VALID_PHONE_REGEX = /^[0-9+\s()-]{7,20}$/;

// Regex to reject any letter in telephone
export const CONTAINS_LETTERS_REGEX = /[a-zA-Z]/;

// Email regex
export const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateCustomerOrder = (req: Request, res: Response, next: NextFunction): void => {
  let { customerName, customerPhone, notes, items, deliveryMethod, deliveryAddress } = req.body;

  // Auto-populate from authenticated user if not explicitly sent in body
  if ((!customerName || !String(customerName).trim()) && req.user) {
    customerName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.firstName;
    req.body.customerName = customerName;
  }
  if ((!customerPhone || !String(customerPhone).trim()) && req.user?.phone) {
    customerPhone = req.user.phone;
    req.body.customerPhone = customerPhone;
  }

  // Validate Customer Name
  if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
    res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
    return;
  }
  if (!VALID_NAME_REGEX.test(customerName.trim()) || !NO_NUMBERS_REGEX.test(customerName.trim())) {
    res.status(400).json({
      error: 'El nombre del cliente no puede contener números ni caracteres inválidos.',
    });
    return;
  }

  // Validate Customer Phone
  if (!customerPhone || typeof customerPhone !== 'string' || !customerPhone.trim()) {
    res.status(400).json({ error: 'El teléfono del cliente es obligatorio.' });
    return;
  }
  if (CONTAINS_LETTERS_REGEX.test(customerPhone) || !VALID_PHONE_REGEX.test(customerPhone.trim())) {
    res.status(400).json({
      error: 'El teléfono no puede contener letras y debe ser un número válido.',
    });
    return;
  }

  // Validate Indicaciones / Notas (permitir indicaciones claras para domicilio o preparación)
  if (notes && typeof notes === 'string' && notes.length > 500) {
    res.status(400).json({
      error: 'Las indicaciones del pedido no pueden exceder los 500 caracteres.',
    });
    return;
  }

  // Validate Delivery Method & Address
  if (!deliveryMethod || !['domicilio', 'recoger'].includes(deliveryMethod)) {
    res.status(400).json({ error: 'Método de entrega inválido (domicilio o recoger).' });
    return;
  }
  if (deliveryMethod === 'domicilio' && (!deliveryAddress || !deliveryAddress.trim())) {
    res.status(400).json({ error: 'La dirección es obligatoria para pedidos con entrega a domicilio.' });
    return;
  }

  // Validate Items
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'El pedido debe incluir al menos un producto.' });
    return;
  }

  for (const item of items) {
    if (!item.productId || typeof item.productId !== 'string') {
      res.status(400).json({ error: 'Cada ítem debe tener un ID de producto válido.' });
      return;
    }
    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      res.status(400).json({ error: 'La cantidad de cada producto debe ser un entero positivo.' });
      return;
    }
  }

  next();
};

export const validateProductInput = (req: Request, res: Response, next: NextFunction): void => {
  const { name, categoryId, category, price, imageUrl, image } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    return;
  }

  const numPrice = typeof price === 'number' ? price : Number(price);
  if (price === undefined || isNaN(numPrice) || numPrice < 0) {
    res.status(400).json({ error: 'El precio debe ser un valor numérico mayor o igual a cero.' });
    return;
  }

  if ((!categoryId || typeof categoryId !== 'string') && (!category || typeof category !== 'string')) {
    res.status(400).json({ error: 'La categoría es obligatoria.' });
    return;
  }

  const img = imageUrl || image;
  if (img && typeof img !== 'string') {
    res.status(400).json({ error: 'La URL o dato de la imagen debe ser un texto válido.' });
    return;
  }

  next();
};
