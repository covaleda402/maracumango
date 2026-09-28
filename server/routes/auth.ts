import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { VALID_EMAIL_REGEX } from '../middleware/validate';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'maracumango_super_secret_jwt_key_2026_prod';

// POST /api/auth/login — User login with bcrypt password verification & JWT generation
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  if (!isDatabaseConfigured()) {
    // Development fallback
    if (cleanEmail === 'admin@maracumango.com' && password === 'admin123') {
      const user = {
        id: 'user-admin-1',
        name: 'Administrador Maracumango',
        firstName: 'Administrador',
        lastName: 'Maracumango',
        email: 'admin@maracumango.com',
        role: 'ADMIN' as const,
        roleId: 'ADMIN' as const,
        branchId: null,
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user });
    }
    if (cleanEmail === 'carlos@maracumango.com' && password === 'worker123') {
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
      };
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user });
    }
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  try {
    const userRes = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.role_id, u.branch_id, u.is_active,
              b.name AS branch_name
       FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE LOWER(u.email) = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas o usuario no registrado.' });
    }

    const userRow = userRes.rows[0];

    if (!userRow.is_active) {
      return res.status(403).json({ error: 'Esta cuenta ha sido desactivada por la administración.' });
    }

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const userPayload = {
      id: userRow.id,
      name: `${userRow.first_name} ${userRow.last_name || ''}`.trim(),
      firstName: userRow.first_name,
      lastName: userRow.last_name,
      email: userRow.email,
      role: userRow.role_id as 'ADMIN' | 'WORKER',
      roleId: userRow.role_id as 'ADMIN' | 'WORKER',
      branchId: userRow.branch_id,
      branchName: userRow.branch_name,
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

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

// GET /api/auth/me — Verify token and return current authenticated user
router.get('/me', (req: Request, res: Response) => {
  if (req.user) {
    return res.json({ user: req.user });
  }
  res.status(401).json({ error: 'No autenticado.' });
});

// GET /api/auth/users — List all staff accounts (Admin only)
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
