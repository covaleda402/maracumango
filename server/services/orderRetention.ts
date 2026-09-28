import { query, isDatabaseConfigured } from '../db';

/**
 * Technical Order Retention Policy (Rules 18 & 19):
 * - Cancelled orders: retained for 30 days, then safely pruned.
 * - Delivered orders: retained for 3 months (90 days) for sales statistics and audit reports, then pruned.
 * Execution is autonomous in backend (no dependency on browser or admin presence).
 */
export async function runOrderRetentionCleanup(): Promise<{
  cleanedCancelled: number;
  cleanedDelivered: number;
}> {
  if (!isDatabaseConfigured()) {
    return { cleanedCancelled: 0, cleanedDelivered: 0 };
  }

  try {
    // 1. Delete cancelled orders older than 30 days
    const cancelledRes = await query(
      `DELETE FROM orders 
       WHERE (status_id = 'CANCELLED' OR status_id = 'Cancelado') 
         AND updated_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
       RETURNING id`
    );

    // 2. Delete delivered orders older than 90 days (3 months)
    const deliveredRes = await query(
      `DELETE FROM orders 
       WHERE (status_id = 'DELIVERED' OR status_id = 'Entregado') 
         AND updated_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
       RETURNING id`
    );

    const cleanedCancelled = cancelledRes.rowCount || 0;
    const cleanedDelivered = deliveredRes.rowCount || 0;

    if (cleanedCancelled > 0 || cleanedDelivered > 0) {
      console.log(
        `🧹 [Políticas de Conservación]: Se depuraron ${cleanedCancelled} pedidos cancelados (>30 días) y ${cleanedDelivered} pedidos entregados (>90 días).`
      );
    }

    return { cleanedCancelled, cleanedDelivered };
  } catch (err: any) {
    console.error('⚠️ [Error en Retención de Pedidos]:', err.message);
    return { cleanedCancelled: 0, cleanedDelivered: 0 };
  }
}

/**
 * Initializes automatic background scheduler for order retention
 */
export function initOrderRetentionScheduler(): void {
  // Run once at server startup (after 5 seconds to allow DB warm-up)
  setTimeout(() => {
    runOrderRetentionCleanup();
  }, 5000);

  // Run recurring check every 24 hours
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runOrderRetentionCleanup();
  }, TWENTY_FOUR_HOURS_MS);
}
