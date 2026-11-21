import React from 'react';
import { useApp } from '../../context/AppContext';

export const FloatingCartButton: React.FC = () => {
  const { cart, cartSubtotal, isCartOpen, setIsCartOpen, userRole } = useApp();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (userRole !== 'customer' || totalItems === 0 || isCartOpen) {
    return null;
  }

  return (
    <aside
      aria-label="Acceso rápido al pedido"
      className="fixed bottom-5 inset-x-4 max-w-md mx-auto sm:inset-x-auto sm:right-6 sm:bottom-6 z-30 pointer-events-auto"
    >
      <button
        type="button"
        onClick={() => setIsCartOpen(true)}
        className="w-full sm:w-auto px-5 py-3.5 rounded-full bg-primary-container hover:bg-primary text-on-primary font-bold shadow-[0_8px_25px_rgba(106,191,0,0.45)] hover:shadow-[0_12px_32px_rgba(106,191,0,0.55)] border border-white/25 transition-all duration-200 flex items-center justify-between sm:justify-start gap-4 active:scale-95 group cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
            <span className="material-symbols-outlined text-[19px]">shopping_bag</span>
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-black flex items-center justify-center shadow-sm">
              {totalItems}
            </span>
          </div>
          <span className="text-sm font-extrabold tracking-wide drop-shadow-sm">
            Hacer Pedido Ya
          </span>
        </div>

        <div className="flex items-center gap-1.5 pl-3 border-l border-white/30 font-mono">
          <span className="text-xs font-black">
            ${cartSubtotal.toLocaleString('es-CO')}
          </span>
          <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </div>
      </button>
    </aside>
  );
};
