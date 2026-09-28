import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'maracumango_super_secret_jwt_key_2026_prod';

export interface AuthenticatedUser {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  role: 'ADMIN' | 'WORKER';
  branchId?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Authentication and authorization middleware.
 * Verifies JWT Bearer tokens and supports fallback headers.
 * Validates backend permissions and enforces branch isolation.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        firstName: decoded.firstName || decoded.name || 'Usuario',
        lastName: decoded.lastName,
        email: decoded.email,
        role: decoded.role,
        branchId: decoded.branchId,
      };
      return next();
    } catch {
      // Invalid or expired token, fall through
    }
  }

  // Header fallback for development/testing
  const roleHeader = (req.headers['x-user-role'] as string)?.toUpperCase();
  const branchHeader = req.headers['x-branch-id'] as string;
  const userIdHeader = req.headers['x-user-id'] as string;

  if (roleHeader === 'ADMIN' || roleHeader === 'WORKER') {
    req.user = {
      id: userIdHeader || (roleHeader === 'ADMIN' ? 'user-admin-1' : 'user-worker-1'),
      firstName: roleHeader === 'ADMIN' ? 'Admin' : 'Trabajador',
      email: roleHeader === 'ADMIN' ? 'admin@maracumango.com' : 'trabajador@maracumango.com',
      role: roleHeader as 'ADMIN' | 'WORKER',
      branchId: branchHeader || (roleHeader === 'WORKER' ? 'sede-1' : null),
    };
  }

  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Acceso denegado. Se requieren permisos de Administrador para realizar esta acción.',
    });
    return;
  }
  next();
};

export const requireWorkerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;
  if (!user || (user.role !== 'ADMIN' && user.role !== 'WORKER')) {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere autenticación de personal autorizado (Admin o Trabajador).',
    });
    return;
  }
  next();
};

/**
 * Enforces branch isolation:
 * If the user is a WORKER, they are strictly restricted to their assigned branch.
 */
export const enforceBranchScope = (req: Request, res: Response, next: NextFunction): void => {
  const user = req.user;

  if (user?.role === 'WORKER') {
    if (!user.branchId) {
      res.status(403).json({ error: 'Trabajador no tiene una sede operativa asignada.' });
      return;
    }

    // If client requested a specific branch in params or query, verify it matches
    const requestedBranch = (req.params.branchId || req.query.branchId || req.body.branchId) as string;
    if (requestedBranch && requestedBranch !== 'all' && requestedBranch !== user.branchId) {
      res.status(403).json({
        error: `Acceso denegado. El trabajador solo puede acceder a su sede asignada (${user.branchId}).`,
      });
      return;
    }
  }

  next();
};
