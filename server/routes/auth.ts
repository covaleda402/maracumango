import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { VALID_EMAIL_REGEX } from '../middleware/validate';
import {
  checkSecurityLockout,
  recordFailedAttempt,
  resetSecurityAttempts,
  normalizeIdentifier,
} from '../middleware/securityLimiter';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'maracumango_super_secret_jwt_key_2026_prod';

// In-memory customer storage fallback for offline / development testing without active DB
const devFallbackCustomers: any[] = [];

interface DevResetToken {
  id: string;
  email: string;
  code?: string;
  tokenHash: string;
  expiresAt: number;
  used: boolean;
}
const devFallbackResetTokens: DevResetToken[] = [];

// Helper to patch database schema on the fly if columns are missing
const patchMissingUserColumns = async () => {
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
  } catch (err: any) {
    console.warn('⚠️ [patchMissingUserColumns]:', err.message);
  }
};

// POST /api/auth/register-customer — Customer registration with mandatory Terms & Habeas Data acceptance
router.post('/register-customer', async (req: Request, res: Response) => {
  const { name, firstName, lastName, email, phone, password, defaultAddress, acceptedTerms } = req.body;

  const resolvedFirstName = (firstName || name || '').trim();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPhone = (phone || '').trim();
  const cleanAddress = (defaultAddress || '').trim();

  if (!resolvedFirstName) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio.' });
  }

  if (!cleanEmail || !VALID_EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
  }

  if (!cleanPhone || cleanPhone.length < 7) {
    return res.status(400).json({ error: 'Ingresa un número de teléfono o celular válido.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  if (!acceptedTerms) {
    return res.status(400).json({
      error: 'Debes aceptar los Términos, Condiciones y la Política de Tratamiento de Datos Personales (Habeas Data) para registrarte.',
    });
  }

  const userId = `cust-${Date.now()}`;

  if (!isDatabaseConfigured()) {
    // Development fallback
    const existing = devFallbackCustomers.find((c) => c.email === cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
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
      role: 'CUSTOMER' as const,
      roleId: 'CUSTOMER' as const,
      branchId: null,
      acceptedTerms: true,
      active: true,
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
      role: 'CUSTOMER' as const,
      roleId: 'CUSTOMER' as const,
      acceptedTerms: true,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '14d' });
    return res.status(201).json({
      token,
      user: tokenPayload,
      message: 'Cuenta creada exitosamente. ¡Bienvenido a Maracumango!',
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
    } catch (insertErr: any) {
      if (insertErr.code === '42703') {
        // Column missing in remote DB, patch and retry
        console.warn('⚠️ Columna faltante detectada al registrar. Aplicando parche estructural...');
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
      name: `${customerRow.firstName} ${customerRow.lastName || ''}`.trim(),
      firstName: customerRow.firstName,
      lastName: customerRow.lastName,
      email: customerRow.email,
      phone: customerRow.phone || cleanPhone,
      defaultAddress: customerRow.defaultAddress || cleanAddress,
      role: 'CUSTOMER' as const,
      roleId: 'CUSTOMER' as const,
      branchId: null,
      acceptedTerms: true,
    };

    const token = jwt.sign(customerPayload, JWT_SECRET, { expiresIn: '14d' });

    res.status(201).json({
      token,
      user: customerPayload,
      message: 'Cuenta creada exitosamente. ¡Bienvenido a Maracumango!',
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe una cuenta registrada con este correo electrónico.' });
    }
    console.error('Error registrando cliente:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login — User login with bcrypt password verification, rate limiting & 15m lockout (Admin, Worker, Customer)
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown_ip';
  const emailKey = normalizeIdentifier('login', cleanEmail);
  const ipKey = normalizeIdentifier('login_ip', clientIp);

  // 1. Check Security Lockouts (Max 5 attempts allowed, 15 minutes lockout)
  const emailLock = await checkSecurityLockout(emailKey);
  if (emailLock.isBlocked) {
    return res.status(429).json({
      error: emailLock.message,
      blocked: true,
      remainingMinutes: emailLock.remainingMinutes,
    });
  }
  const ipLock = await checkSecurityLockout(ipKey);
  if (ipLock.isBlocked) {
    return res.status(429).json({
      error: ipLock.message,
      blocked: true,
      remainingMinutes: ipLock.remainingMinutes,
    });
  }

  if (!isDatabaseConfigured()) {
    // Development fallback
    if (cleanEmail === 'admin@maracumango.com' && password === 'admin123') {
      await resetSecurityAttempts(emailKey);
      await resetSecurityAttempts(ipKey);
      const user = {
        id: 'user-admin-1',
        name: 'Administrador Maracumango',
        firstName: 'Administrador',
        lastName: 'Maracumango',
        email: 'admin@maracumango.com',
        role: 'ADMIN' as const,
        roleId: 'ADMIN' as const,
        branchId: null,
        acceptedTerms: true,
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user });
    }
    if (cleanEmail === 'carlos@maracumango.com' && password === 'worker123') {
      await resetSecurityAttempts(emailKey);
      await resetSecurityAttempts(ipKey);
      const user = {
        id: 'user-worker-1',
        name: 'Carlos Gómez',
        firstName: 'Carlos',
        lastName: 'Gómez',
        email: 'carlos@maracumango.com',
        role: 'WORKER' as const,
        roleId: 'WORKER' as const,
        branchId: 'sede-1',
        branchName: 'Sede Parque del Amor y la Amistad',
        acceptedTerms: true,
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user });
    }

    // Check dev customers
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
          role: 'CUSTOMER' as const,
          roleId: 'CUSTOMER' as const,
          acceptedTerms: true,
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '14d' });
        return res.json({ token, user: tokenPayload, message: 'Inicio de sesión exitoso.' });
      }
    }

    // Failed credentials in fallback
    const failEmail = await recordFailedAttempt(emailKey);
    await recordFailedAttempt(ipKey);
    return res.status(failEmail.isBlocked ? 429 : 401).json({
      error: failEmail.message,
      blocked: failEmail.isBlocked,
      attemptsLeft: failEmail.attemptsLeft,
      remainingMinutes: failEmail.remainingMinutes,
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
    } catch (queryErr: any) {
      if (queryErr.code === '42703') {
        // Missing column in database, patch and retry
        console.warn('⚠️ Columna u.phone o u.default_address faltante. Parcheando esquema y reintentando login...');
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
        remainingMinutes: fail.remainingMinutes,
      });
    }

    const userRow = userRes.rows[0];

    if (!userRow.is_active) {
      return res.status(403).json({ error: 'Esta cuenta ha sido desactivada por la administración.' });
    }

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 401).json({
        error: fail.message,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft,
        remainingMinutes: fail.remainingMinutes,
      });
    }

    // Successful login: clear attempt locks
    await resetSecurityAttempts(emailKey);
    await resetSecurityAttempts(ipKey);

    const userPayload = {
      id: userRow.id,
      name: `${userRow.first_name} ${userRow.last_name || ''}`.trim(),
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      email: userRow.email,
      phone: userRow.phone || '',
      defaultAddress: userRow.default_address || '',
      role: userRow.role_id as 'ADMIN' | 'WORKER' | 'CUSTOMER',
      roleId: userRow.role_id as 'ADMIN' | 'WORKER' | 'CUSTOMER',
      branchId: userRow.branch_id,
      branchName: userRow.branch_name,
      acceptedTerms: userRow.accepted_terms ?? true,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: userPayload.role === 'CUSTOMER' ? '14d' : '7d' });

    res.json({
      token,
      user: userPayload,
      message: 'Inicio de sesión exitoso.',
    });
  } catch (error: any) {
    console.error('Error during login:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/forgot-password — Request 6-digit password recovery code with 15m lockout protection
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !VALID_EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Por favor ingresa un correo electrónico válido.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown_ip';
  const emailKey = normalizeIdentifier('reset', cleanEmail);
  const ipKey = normalizeIdentifier('reset_ip', clientIp);

  // Check rate limits & 15m lockouts
  const emailLock = await checkSecurityLockout(emailKey);
  if (emailLock.isBlocked) {
    return res.status(429).json({
      error: emailLock.message,
      blocked: true,
      remainingMinutes: emailLock.remainingMinutes,
    });
  }
  const ipLock = await checkSecurityLockout(ipKey);
  if (ipLock.isBlocked) {
    return res.status(429).json({
      error: ipLock.message,
      blocked: true,
      remainingMinutes: ipLock.remainingMinutes,
    });
  }

  // Generate 64-character cryptographic token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  const tokenId = `rst-${Date.now()}`;

  // Build client origin for the secure reset link
  const clientOrigin =
    (req.headers.origin as string) ||
    (req.headers.referer ? new URL(req.headers.referer as string).origin : '') ||
    process.env.APP_URL ||
    'https://maracumango-theta.vercel.app';

  const resetLink = `${clientOrigin}/?resetToken=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

  if (!isDatabaseConfigured()) {
    devFallbackResetTokens.push({
      id: tokenId,
      email: cleanEmail,
      code: rawToken.slice(0, 6),
      tokenHash,
      expiresAt,
      used: false,
    });
    const emailResult = await sendPasswordResetEmail(cleanEmail, resetLink);
    return res.json({
      message: emailResult.sent
        ? 'Enlace de restablecimiento seguro enviado exitosamente a tu correo electrónico. Válido por 15 minutos.'
        : 'Enlace de restablecimiento generado exitosamente. Válido por 15 minutos.',
      emailSent: emailResult.sent,
      resetLink: emailResult.sent ? undefined : resetLink,
      resetToken: emailResult.sent ? undefined : rawToken,
      code: rawToken.slice(0, 6),
      email: cleanEmail,
      expiresInMinutes: 15,
    });
  }

  try {
    // Check if user exists
    const userCheck = await query('SELECT id, first_name FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (userCheck.rows.length === 0) {
      // Record failed attempt on unknown email to prevent spamming
      await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(404).json({
        error: 'No se encontró ninguna cuenta registrada con este correo electrónico.',
      });
    }

    const user = userCheck.rows[0];

    // Invalidate prior unused tokens for this email
    await query('UPDATE password_reset_tokens SET used = TRUE WHERE LOWER(email) = $1', [cleanEmail]);

    // Insert new token storing ONLY the SHA-256 hash in DB (never plain token!)
    await query(
      `INSERT INTO password_reset_tokens (id, user_id, email, code, token_hash, expires_at, used)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE)`,
      [tokenId, user.id, cleanEmail, rawToken.slice(0, 6), tokenHash, new Date(expiresAt).toISOString()]
    );

    // Dispatch real email via SMTP / Gmail / Resend
    const emailResult = await sendPasswordResetEmail(cleanEmail, resetLink, user.first_name);

    res.json({
      message: emailResult.sent
        ? 'Enlace de restablecimiento seguro enviado exitosamente a tu correo electrónico. Válido por 15 minutos.'
        : 'Enlace de restablecimiento generado. No se detectó un servidor SMTP configurado en Vercel.',
      emailSent: emailResult.sent,
      resetLink: emailResult.sent ? undefined : resetLink,
      resetToken: emailResult.sent ? undefined : rawToken,
      code: rawToken.slice(0, 6),
      email: cleanEmail,
      expiresInMinutes: 15,
    });
  } catch (error: any) {
    console.error('Error generating reset link:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/reset-password — Verify token hash and update password with 5-attempt limit & 15m lockout
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, token, code, newPassword } = req.body;
  const suppliedToken = String(token || code || '').trim();

  if (!email || !suppliedToken || !newPassword) {
    return res.status(400).json({ error: 'Correo, token de restablecimiento y nueva contraseña son obligatorios.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown_ip';
  const emailKey = normalizeIdentifier('reset', cleanEmail);
  const ipKey = normalizeIdentifier('reset_ip', clientIp);

  // Check rate limits & 15m lockouts
  const emailLock = await checkSecurityLockout(emailKey);
  if (emailLock.isBlocked) {
    return res.status(429).json({
      error: emailLock.message,
      blocked: true,
      remainingMinutes: emailLock.remainingMinutes,
    });
  }
  const ipLock = await checkSecurityLockout(ipKey);
  if (ipLock.isBlocked) {
    return res.status(429).json({
      error: ipLock.message,
      blocked: true,
      remainingMinutes: ipLock.remainingMinutes,
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  // Compute SHA-256 hash of the supplied token
  const computedHash = crypto.createHash('sha256').update(suppliedToken).digest('hex');

  if (!isDatabaseConfigured()) {
    const validToken = devFallbackResetTokens.find(
      (t) =>
        t.email === cleanEmail &&
        (t.tokenHash === computedHash || t.code === suppliedToken || t.tokenHash === suppliedToken) &&
        !t.used &&
        t.expiresAt > Date.now()
    );

    if (!validToken) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 400).json({
        error: `Enlace o token de recuperación incorrecto o vencido. ${fail.message}`,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft,
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
    return res.json({ message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.' });
  }

  try {
    const tokenRes = await query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE LOWER(email) = $1 
         AND (token_hash = $2 OR code = $3)
         AND used = FALSE 
         AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, computedHash, suppliedToken]
    );

    if (tokenRes.rows.length === 0) {
      const fail = await recordFailedAttempt(emailKey);
      await recordFailedAttempt(ipKey);
      return res.status(fail.isBlocked ? 429 : 400).json({
        error: `El enlace o token de verificación es inválido o ha expirado. ${fail.message}`,
        blocked: fail.isBlocked,
        attemptsLeft: fail.attemptsLeft,
        remainingMinutes: fail.remainingMinutes,
      });
    }

    const tokenRow = tokenRes.rows[0];
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update user password and burn (mark used) the token
    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, tokenRow.user_id]
    );
    await query(`UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`, [tokenRow.id]);

    // Reset lockout counters on success
    await resetSecurityAttempts(emailKey);
    await resetSecurityAttempts(ipKey);

    res.json({
      message: '¡Contraseña restablecida con éxito! Ya puedes iniciar sesión en Maracumango con tu nueva contraseña.',
    });
  } catch (error: any) {
    console.error('Error resetting password:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me — Verify token and return current authenticated user
router.get('/me', (req: Request, res: Response) => {
  if (req.user) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ error: 'No autenticado.' });
});

// PUT /api/auth/profile — Update current authenticated user profile (address, phone, name)
router.put('/profile', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }

  const { name, firstName, lastName, phone, defaultAddress } = req.body;
  const resolvedFirstName = (firstName || name || '').trim() || req.user.firstName;
  const cleanPhone = phone !== undefined ? String(phone).trim() : req.user.phone;
  const cleanAddress = defaultAddress !== undefined ? String(defaultAddress).trim() : req.user.defaultAddress;

  if (!isDatabaseConfigured()) {
    const updated = {
      ...req.user,
      firstName: resolvedFirstName,
      name: resolvedFirstName,
      phone: cleanPhone,
      defaultAddress: cleanAddress,
    };
    req.user = updated;
    const token = jwt.sign(updated, JWT_SECRET, { expiresIn: '14d' });
    return res.json({ user: updated, token, message: 'Perfil actualizado correctamente.' });
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
      name: `${updatedRow.firstName} ${updatedRow.lastName || ''}`.trim(),
      email: updatedRow.email,
      phone: updatedRow.phone,
      defaultAddress: updatedRow.defaultAddress,
      role: updatedRow.role,
      roleId: updatedRow.roleId,
      acceptedTerms: updatedRow.acceptedTerms ?? true,
    };

    const token = jwt.sign(updatedPayload, JWT_SECRET, { expiresIn: '14d' });
    res.json({ user: updatedPayload, token, message: 'Perfil actualizado correctamente.' });
  } catch (error: any) {
    console.error('Error actualizando perfil:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/users — List all staff accounts (Admin only, strictly excludes customers)
router.get('/users', requireAdmin, async (_req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    return res.json([
      { id: 'user-admin-1', firstName: 'Admin', lastName: 'Principal', name: 'Admin Principal', email: 'admin@maracumango.com', role: 'ADMIN', roleId: 'ADMIN', branchId: null, active: true },
      { id: 'user-worker-1', firstName: 'Carlos', lastName: 'Gómez', name: 'Carlos Gómez', email: 'carlos@maracumango.com', role: 'WORKER', roleId: 'WORKER', branchId: 'sede-1', branchName: 'Sede Parque del Amor y la Amistad', active: true },
      { id: 'user-worker-2', firstName: 'Laura', lastName: 'Trujillo', name: 'Laura Trujillo', email: 'laura@maracumango.com', role: 'WORKER', roleId: 'WORKER', branchId: 'sede-2', branchName: 'Sede Sector Edsbur / Único', active: true },
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
  } catch (error: any) {
    console.error('Error fetching users from DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/users — Create worker or admin (Admin only)
router.post('/users', requireAdmin, async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, roleId, role, branchId } = req.body;

  const targetRole = (roleId || role || '').toUpperCase();

  if (!firstName || !email || !password || !targetRole) {
    return res.status(400).json({ error: 'Nombre, email, contraseña y rol son obligatorios.' });
  }

  if (!VALID_EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Formato de correo electrónico inválido.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  if (!['ADMIN', 'WORKER'].includes(targetRole)) {
    return res.status(400).json({ error: 'El rol debe ser ADMIN o WORKER.' });
  }

  // Business Rules:
  // WORKER -> branch is required
  // ADMIN -> branch is optional (null allowed)
  if (targetRole === 'WORKER' && !branchId) {
    return res.status(400).json({ error: 'Un trabajador debe tener asignada una sede operativa obligatoria.' });
  }

  const finalBranchId = targetRole === 'WORKER' ? branchId : (branchId || null);

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
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
      name: `${result.rows[0].firstName} ${result.rows[0].lastName || ''}`.trim(),
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con ese correo electrónico.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/users/:id — Update worker/admin info (Admin only)
router.put('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { firstName, lastName, roleId, role, branchId, active, newPassword } = req.body;

  // Protect customer accounts from being modified via staff management endpoint
  if (id.startsWith('cust-')) {
    return res.status(400).json({ error: 'No se pueden modificar cuentas de clientes desde la gestión de personal.' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
  }

  try {
    // 1. Fetch current target user to protect roles and prevent accidental conversion
    const currentRes = await query('SELECT id, role_id, email FROM users WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const currentTarget = currentRes.rows[0];

    // Protect customer accounts from being modified via staff management endpoint
    if (currentTarget.role_id === 'CUSTOMER') {
      return res.status(400).json({ error: 'No se pueden modificar cuentas de clientes desde la gestión de personal.' });
    }

    // Determine target role: don't accidentally demote ADMIN unless explicitly intended
    let finalRole = currentTarget.role_id;
    if (roleId || role) {
      const specifiedRole = (roleId || role).toUpperCase();
      if (['ADMIN', 'WORKER'].includes(specifiedRole)) {
        // Prevent current admin from demoting themselves
        if (req.user?.id === id && specifiedRole !== 'ADMIN') {
          return res.status(400).json({
            error: 'No puedes quitarte a ti mismo los permisos de Administrador.',
          });
        }
        finalRole = specifiedRole;
      }
    }

    // Role rules: WORKER requires branchId; ADMIN has branchId optional
    let finalBranchId = branchId !== undefined ? branchId : null;
    if (finalRole === 'WORKER') {
      if (!finalBranchId) {
        return res.status(400).json({
          error: 'Un trabajador debe tener asignada una sede operativa obligatoria.',
        });
      }
    } else {
      // ADMIN -> branch optional
      if (!finalBranchId) {
        finalBranchId = null;
      }
    }

    let passwordClause = '';
    const params: any[] = [
      firstName ? firstName.trim() : null,
      lastName !== undefined ? (lastName ? lastName.trim() : null) : null,
      finalRole,
      finalBranchId,
      active !== undefined ? !!active : null,
      id,
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
      name: `${updatedUser.firstName} ${updatedUser.lastName || ''}`.trim(),
    });
  } catch (error: any) {
    console.error('Error updating user in DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/auth/users/:id — Delete user (Admin only, allows deleting another Admin or Worker)
router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  if (req.user?.id === id) {
    return res.status(400).json({
      error: 'No puedes eliminar tu propia cuenta de Administrador activa.',
    });
  }

  if (!isDatabaseConfigured()) {
    return res.status(503).json({ error: 'Base de datos no configurada.' });
  }

  try {
    // Check if target user exists
    const userCheck = await query('SELECT id, email, role_id, first_name FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const targetUser = userCheck.rows[0];

    // Try hard delete first
    try {
      await query('DELETE FROM users WHERE id = $1', [id]);
      return res.json({
        message: `El usuario ${targetUser.first_name} (${targetUser.email}) fue eliminado permanentemente de la base de datos.`,
        deleted: true,
      });
    } catch {
      // If referenced in historical orders (accepted_by), soft delete as fallback
      await query('UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return res.json({
        message: `El usuario ${targetUser.first_name} fue desactivado debido a que tiene registros históricos asociados.`,
        deleted: true,
      });
    }
  } catch (error: any) {
    console.error('Error deleting user in DB:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
