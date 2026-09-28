import React from 'react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { config } = useApp();

  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant/30 pt-space-2xl pb-space-xl">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop grid grid-cols-1 md:grid-cols-12 gap-space-xl">
        {/* Brand Column */}
        <div className="md:col-span-5 flex flex-col items-start space-y-space-md">
          <div className="flex items-center gap-space-xs">
            <img
              src={config.logoUrl || '/logo-maracumango.png'}
              alt={config.businessName || 'Maracumango'}
              className="h-12 w-auto object-contain"
              style={{ maxWidth: '160px' }}
            />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
            El auténtico sabor de los granizados, micheladas y helados artesanales en Neiva, Huila. Elaborados con pulpa 100% natural de maracuyá y mango biche.
          </p>
          <div className="inline-flex items-center gap-space-xs px-space-sm py-space-xs rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary-container">verified</span>
            <span>Productos 100% Artesanales • Neiva, Huila</span>
          </div>
        </div>

        {/* Redes Sociales Oficiales */}
        <div className="md:col-span-4 flex flex-col space-y-space-xs">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">share</span>
            Redes Sociales
          </h4>
          <div className="p-space-md rounded-2xl bg-surface-container-lowest space-y-2.5 border border-outline-variant/20">
            <p className="text-body-sm text-on-surface-variant">
              Síguenos en nuestras redes oficiales para conocer promociones, nuevos sabores y eventos en Neiva:
            </p>
            <div className="space-y-2 pt-1">
              <a
                href="https://www.instagram.com/maracumangolesburg?igsi=MTNheDl4bGFzdmc5aw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-label-md text-xs font-semibold transition-colors group"
              >
                <svg className="w-5 h-5 text-[#E1306C] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <div className="flex-1 truncate">
                  <span className="font-semibold block leading-tight">Instagram</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">@maracumangolesburg</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
                  open_in_new
                </span>
              </a>

              <a
                href="https://www.facebook.com/p/Maracumango-Neiva-100083763140387/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 font-label-md text-xs font-semibold transition-colors group"
              >
                <svg className="w-5 h-5 text-[#1877F2] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <div className="flex-1 truncate">
                  <span className="font-semibold block leading-tight">Facebook</span>
                  <span className="text-[11px] text-on-surface-variant font-normal">Maracumango Neiva</span>
                </div>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
                  open_in_new
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* Pagos & Garantía */}
        <div className="md:col-span-3 flex flex-col space-y-space-xs">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-1 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
            Medios de Pago
          </h4>
          <div className="p-space-md rounded-2xl bg-surface-container-lowest space-y-2 border border-outline-variant/20">
            <p className="text-body-sm text-on-surface-variant">
              Aceptamos pagos rápidos y seguros:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-primary border border-outline-variant/30">
                Nequi
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface border border-outline-variant/30">
                Efectivo
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant/15 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">local_shipping</span>
              Entrega rápida a domicilio o para llevar.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop mt-space-xl pt-space-md border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between text-body-sm text-on-surface-variant gap-space-xs">
        <p>© {new Date().getFullYear()} {config.businessName || 'Maracumango'} Neiva. Todos los derechos reservados.</p>
        <p className="font-label-sm">Sistema de Gestión & Ventas • {config.businessName || 'Maracumango'}</p>
      </div>
    </footer>
  );
};

