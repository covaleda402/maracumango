import { query, isDatabaseConfigured } from '../db';

interface MemoryLockRecord {
  count: number;
  blockedUntil: number | null;
  lastAttempt: number;
}

const inMemoryAttempts = new Map<string, MemoryLockRecord>();

const MAX_ALLOWED_ATTEMPTS = 5;
const _HARD_LOCKOUT_ATTEMPTS = 7;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

/**
 * Normalizes identifier for lock tracking (email or IP)
 */
export const normalizeIdentifier = (prefix: string, key: string): string => {
  return `${prefix}:${key.toLowerCase().trim()}`;
};

/**
 * Checks whether an identifier (email or IP) is currently blocked.
 */
export const checkSecurityLockout = async (
  identifier: string
): Promise<{ isBlocked: boolean; remainingMinutes?: number; message?: string }> => {
  const now = Date.now();

  // 1. Check in-memory first
  const mem = inMemoryAttempts.get(identifier);
  if (mem && mem.blockedUntil && mem.blockedUntil > now) {
    const remainingMinutes = Math.max(1, Math.ceil((mem.blockedUntil - now) / 60000));
    return {
      isBlocked: true,
      remainingMinutes,
      message: `Has superado el límite de intentos permitidos. Por seguridad, el acceso está bloqueado durante ${remainingMinutes} minuto(s). Intenta más tarde.`,
    };
  }

  // 2. Check Database if configured
  if (isDatabaseConfigured()) {
    try {
      const res = await query(
        `SELECT attempt_count, blocked_until FROM security_attempt_logs WHERE identifier = $1`,
        [identifier]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        if (row.blocked_until) {
          const dbBlockedUntil = new Date(row.blocked_until).getTime();
          if (dbBlockedUntil > now) {
            const remainingMinutes = Math.max(1, Math.ceil((dbBlockedUntil - now) / 60000));
            // Sync to memory
            inMemoryAttempts.set(identifier, {
              count: row.attempt_count,
              blockedUntil: dbBlockedUntil,
              lastAttempt: now,
            });
            return {
              isBlocked: true,
              remainingMinutes,
              message: `Has superado el límite de intentos permitidos. Por seguridad, el acceso está bloqueado durante ${remainingMinutes} minuto(s). Intenta más tarde.`,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('⚠️ [securityLimiter]: Error al verificar bloqueo en BD:', err.message);
    }
  }

  return { isBlocked: false };
};

/**
 * Records a failed authentication or password recovery attempt.
 * Enforces a strict lockout of 15 minutes when attempts reach 5 (up to 7 max).
 */
export const recordFailedAttempt = async (
  identifier: string
): Promise<{
  isBlocked: boolean;
  attemptsLeft: number;
  remainingMinutes?: number;
  message: string;
}> => {
  const now = Date.now();
  let currentCount = 1;
  let blockedUntil: number | null = null;

  // 1. Update in-memory
  const mem = inMemoryAttempts.get(identifier);
  if (mem) {
    // If previous lockout expired, reset counter
    if (mem.blockedUntil && mem.blockedUntil <= now) {
      currentCount = 1;
    } else {
      currentCount = mem.count + 1;
    }
  }

  if (currentCount >= MAX_ALLOWED_ATTEMPTS) {
    blockedUntil = now + LOCKOUT_MS;
  }

  inMemoryAttempts.set(identifier, {
    count: currentCount,
    blockedUntil,
    lastAttempt: now,
  });

  // 2. Persist in Database if configured
  if (isDatabaseConfigured()) {
    try {
      await query(
        `INSERT INTO security_attempt_logs (identifier, attempt_count, blocked_until, last_attempt)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (identifier) DO UPDATE SET
           attempt_count = EXCLUDED.attempt_count,
           blocked_until = EXCLUDED.blocked_until,
           last_attempt = CURRENT_TIMESTAMP`,
        [identifier, currentCount, blockedUntil ? new Date(blockedUntil).toISOString() : null]
      );
    } catch (err: any) {
      console.warn('⚠️ [securityLimiter]: Error al registrar intento fallido en BD:', err.message);
    }
  }

  if (currentCount >= MAX_ALLOWED_ATTEMPTS) {
    return {
      isBlocked: true,
      attemptsLeft: 0,
      remainingMinutes: LOCKOUT_MINUTES,
      message: `Has superado el límite de ${MAX_ALLOWED_ATTEMPTS} intentos permitidos. Por seguridad, el acceso para esta cuenta o dispositivo está bloqueado durante ${LOCKOUT_MINUTES} minutos.`,
    };
  }

  const attemptsLeft = MAX_ALLOWED_ATTEMPTS - currentCount;
  return {
    isBlocked: false,
    attemptsLeft,
    message: `Credenciales o código incorrectos. Te quedan ${attemptsLeft} intento(s) permitido(s) antes del bloqueo temporal de ${LOCKOUT_MINUTES} minutos.`,
  };
};

/**
 * Resets failed attempts after a successful login or password reset.
 */
export const resetSecurityAttempts = async (identifier: string): Promise<void> => {
  inMemoryAttempts.delete(identifier);

  if (isDatabaseConfigured()) {
    try {
      await query(`DELETE FROM security_attempt_logs WHERE identifier = $1`, [identifier]);
    } catch (err: any) {
      console.warn('⚠️ [securityLimiter]: Error al limpiar intentos en BD:', err.message);
    }
  }
};
