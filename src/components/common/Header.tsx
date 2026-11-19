import React from 'react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const {
    setActiveTab,
    cart,

    cartSubtotal,
    setIsCartOpen,
    userRole,
    currentUser,
    setIsRoleModalOpen,
    config,
  } = useApp();

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-40 bg-surface/90 backdrop-blur-xl shadow-[0_4px_16px_-2px_rgba(106,191,0,0.10)]">
      <div className="h-20 max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop flex items-center justify-between gap-space-sm">
        {/* Brand & Logo */}
        <div className="flex items-center gap-space-md">
          <button
            onClick={() => setActiveTab('inicio')}
            className="flex items-center gap-space-sm group focus:outline-none"
          >
            <img
              src={config.logoUrl || '/logo-maracumango.png'}
              alt={config.businessName || 'Maracumango'}
              className="h-14 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
              style={{ maxWidth: '180px' }}
            />
          </button>

          {/* Store Live Pill & DB indicator */}
          <div className="hidden xl:flex items-center gap-space-2xs px-space-xs py-space-2xs bg-surface-container-low rounded-full">
            <span className="w-2 h-2 rounded-full bg-tertiary-container animate-pulse"></span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              Abierto Neiva • Cra. 7 / Cll 21
            </span>
          </div>
        </div>

        {/* Customer Navigation */}
        {userRole === 'customer' && (
          <nav className="hidden md:flex items-center gap-space-xs font-label-lg text-label-lg">
            <button
              onClick={() => {
                setActiveTab('inicio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-primary-container text-on-primary font-label-lg shadow-sm px-space-md py-space-xs rounded-full transition-all"
            >
              Menú & Catálogo
            </button>
          </nav>
        )}


        {/* Action Controls */}
        <div className="flex items-center gap-space-xs">
          {/* Cart Button */}
          {userRole === 'customer' && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-secondary-container text-on-secondary-container shadow-[0_4px_16px_-2px_rgba(253,196,37,0.20)] hover:bg-secondary-fixed active:scale-95 transition-all font-label-md text-label-md"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span>
                Ver Pedido ({totalCartCount}) • ${cartSubtotal.toLocaleString('es-CO')}
              </span>
            </button>
          )}

          {/* Auth / Account Access Pill */}
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className={`flex items-center gap-space-2xs px-space-sm py-space-xs rounded-full transition-all font-label-md text-label-md border ${
              currentUser
                ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border-outline-variant/30'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {currentUser ? 'account_circle' : 'person'}
            </span>
            <span className="hidden sm:inline font-semibold">
              {currentUser
                ? `Hola, ${currentUser.firstName || currentUser.name}`
                : 'Iniciar Sesión'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
