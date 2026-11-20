import React, { useState } from 'react';
import type { Order, OrderStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { PRODUCT_INGREDIENTS } from '../../data/mockData';

interface WorkerOrderCardProps {
  order: Order;
}

export const WorkerOrderCard: React.FC<WorkerOrderCardProps> = ({ order }) => {
  const { updateOrderStatus, startPreparation, currentUser } = useApp();
  const [expandedIngredients, setExpandedIngredients] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isPreparing = order.status === 'PREPARING' || (order.status as string) === 'En preparación';
  const isPreparedByOther = isPreparing && Boolean(order.preparedBy) && order.preparedBy !== currentUser?.id;

  const toggleIngredient = (idx: number) => {
    setExpandedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'ACCEPTED':
      case 'Pendiente':
      case 'PENDING_ADMIN':
        return 'bg-secondary-container/30 text-secondary border-secondary/30';
      case 'En preparación':
      case 'PREPARING':
        return 'bg-primary-container/20 text-primary border-primary/30';
      case 'Listo':
      case 'READY':
        return 'bg-tertiary-container/20 text-tertiary border-tertiary/30';
      case 'Entregado':
      case 'DELIVERED':
        return 'bg-surface-container text-on-surface-variant border-outline-variant/30';
      default:
        return 'bg-surface-container text-on-surface';
    }
  };

  const handleAction = async () => {
    setActionError(null);

    if (isPreparedByOther) {
      setActionError(`Solo ${order.preparedByName || 'el compañero que tomó el pedido'} puede marcarlo como listo.`);
      return;
    }

    setIsProcessing(true);

    try {
      if (order.status === 'ACCEPTED' || (order.status as string) === 'Aceptado') {
        // Atomic preparation claiming
        const res = await startPreparation(order.id);
        if (!res.success) {
          setActionError(res.error || 'No se pudo tomar el pedido.');
        }
      } else if (order.status === 'PREPARING' || order.status === 'En preparación') {
        await updateOrderStatus(order.id, 'READY');
      } else if (order.status === 'READY' || order.status === 'Listo') {
        await updateOrderStatus(order.id, 'DELIVERED');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar el pedido.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getNextStatusAction = (currentStatus: OrderStatus) => {
    switch (currentStatus) {
      case 'ACCEPTED':
      case 'Pendiente':
        return {
          label: 'EMPEZAR A PREPARAR',
          btnClass: 'bg-primary-container text-on-primary hover:bg-primary',
          icon: 'blender',
          disabled: false,
          tooltip: 'Tomar pedido e iniciar preparación',
        };
      case 'En preparación':
      case 'PREPARING':
        if (isPreparedByOther) {
          return {
            label: `En preparación por ${order.preparedByName || 'compañero'}`,
            btnClass: 'bg-surface-container text-on-surface-variant cursor-not-allowed border border-outline-variant/40 opacity-80',
            icon: 'lock',
            disabled: true,
            tooltip: `Pedido tomado por ${order.preparedByName}. Solo esta persona puede marcarlo como listo.`,
          };
        }
        return {
          label: 'Marcar como Listo',
          btnClass: 'bg-tertiary-container text-on-tertiary hover:bg-tertiary',
          icon: 'check_circle',
          disabled: false,
          tooltip: 'Finalizar preparación y notificar al cliente',
        };
      case 'Listo':
      case 'READY':
        return {
          label: 'Entregar Pedido',
          btnClass: 'bg-surface-container-highest text-on-surface hover:bg-outline-variant/30',
          icon: 'task_alt',
          disabled: false,
          tooltip: 'Confirmar entrega al cliente',
        };
      default:
        return null;
    }
  };

  const nextAction = getNextStatusAction(order.status);
  const formattedTime = new Date(order.createdAt).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-space-md shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] border border-outline-variant/20 flex flex-col justify-between space-y-space-md hover:shadow-md transition-shadow">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm text-primary font-bold">
              {order.orderNumber}
            </span>
            <span className="text-body-sm text-on-surface-variant font-medium">
              ({formattedTime})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {order.sedeNombre && (
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-[11px] font-label-sm text-on-surface-variant border border-outline-variant/20">
                {order.sedeNombre.includes('Amor') ? 'Parque del Amor' : 'Edsbur / Único'}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full font-label-sm text-[11px] uppercase tracking-wider border font-bold ${getStatusBadge(
                order.status
              )}`}
            >
              {order.status === 'ACCEPTED' ? 'Aprobado' : order.status === 'PREPARING' ? 'En Preparación' : order.status === 'READY' ? 'Listo' : order.status === 'DELIVERED' ? 'Entregado' : order.status}
            </span>
          </div>
        </div>

        {/* Worker Assignment Tag */}
        {order.preparedByName && (
          <div
            className={`mb-2 px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-1.5 ${
              isPreparedByOther
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                : 'bg-primary-container/15 border-primary/25 text-primary'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">
                {isPreparedByOther ? 'lock' : 'soup_kitchen'}
              </span>
              <span>
                {isPreparedByOther ? (
                  <>
                    En preparación por: <strong>{order.preparedByName}</strong>
                  </>
                ) : (
                  <>
                    <strong>Tú estás preparando este pedido</strong>
                  </>
                )}
              </span>
            </div>
            {isPreparedByOther && (
              <span className="text-[10px] bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                Exclusivo
              </span>
            )}
          </div>
        )}

        {/* Action Error Banner (e.g. race condition conflict) */}
        {actionError && (
          <div className="mb-3 p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
            <span>{actionError}</span>
          </div>
        )}

        {/* Customer & Delivery Context */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-body-sm">
            <span className="font-label-lg text-on-surface">{order.customerName}</span>
            <a
              href={`https://wa.me/57${order.customerPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium text-xs flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">call</span>
              {order.customerPhone}
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
            <span className="inline-flex items-center gap-1 font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container">
              <span className="material-symbols-outlined text-[14px]">
                {order.deliveryMethod === 'domicilio' ? 'moped' : 'storefront'}
              </span>
              {order.deliveryMethod === 'domicilio' ? 'Domicilio' : 'Recoger en tienda'}
            </span>

            <span className="inline-flex items-center gap-1 font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container">
              <span className="material-symbols-outlined text-[14px]">
                {order.paymentMethod === 'nequi' ? 'account_balance_wallet' : 'payments'}
              </span>
              {order.paymentMethod === 'nequi' ? 'Nequi' : 'Efectivo'}
            </span>
          </div>

          {order.deliveryAddress && (
            <p className="text-body-sm text-on-surface-variant font-medium flex items-start gap-1 pt-1">
              <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                location_on
              </span>
              <span>{order.deliveryAddress}</span>
            </p>
          )}

          {/* Destacado de Notas del Cliente */}
          {order.notes && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-body-sm mt-2 flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-bounce">
                priority_high
              </span>
              <div>
                <span className="font-semibold text-xs uppercase tracking-wider block text-amber-700 dark:text-amber-300">
                  Nota del Cliente
                </span>
                <span className="font-medium">{order.notes}</span>
              </div>
            </div>
          )}
        </div>

        {/* Items List with preparation ingredients accordion */}
        <div className="p-space-sm rounded-2xl bg-surface-container-low border border-outline-variant/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider block">
              Ítems a preparar & Recetas
            </span>
            <span className="text-[10px] text-on-surface-variant">Clic en ítem para ver ingredientes</span>
          </div>

          {order.items.map((item, idx) => {
            const ingredients = item.ingredients || PRODUCT_INGREDIENTS[item.productId] || [];
            const isExpanded = !!expandedIngredients[idx];

            return (
              <div key={idx} className="rounded-xl bg-surface-container-lowest p-2 border border-outline-variant/15 transition-colors">
                <div
                  onClick={() => toggleIngredient(idx)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary-container text-on-primary font-bold font-label-sm text-xs flex items-center justify-center">
                      {item.quantity}x
                    </span>
                    <span className="font-medium text-body-sm text-on-surface">{item.productName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-on-surface-variant font-semibold">
                      ${(item.unitPrice * item.quantity).toLocaleString('es-CO')}
                    </span>
                    <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Collapsible Ingredients Accordion */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-outline-variant/15 pl-8 space-y-1 animate-fadeIn">
                    <span className="text-[11px] font-semibold text-primary block">
                      Ingredientes requeridos:
                    </span>
                    {ingredients.length > 0 ? (
                      <ul className="list-disc list-inside text-xs text-on-surface-variant space-y-0.5">
                        {ingredients.map((ing, i) => (
                          <li key={i} className="text-on-surface-variant">
                            {ing}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-on-surface-variant italic">Receta estándar</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer & Action Button (Point 13: NO cancel button for workers) */}
      <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between gap-space-xs">
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider">
            Total Pedido
          </span>
          <span className="font-headline-sm text-headline-sm text-primary font-bold">
            ${order.total.toLocaleString('es-CO')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {nextAction && (
            <button
              onClick={handleAction}
              disabled={isProcessing || nextAction.disabled}
              title={nextAction.tooltip}
              className={`px-4 py-2.5 rounded-2xl font-label-md text-label-md shadow-sm transition-all flex items-center gap-1.5 ${
                nextAction.disabled
                  ? 'opacity-80 cursor-not-allowed'
                  : 'active:scale-95 disabled:opacity-50'
              } ${nextAction.btnClass}`}
            >
              <span className="material-symbols-outlined text-[18px]">{nextAction.icon}</span>
              <span>{isProcessing ? 'Procesando...' : nextAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
