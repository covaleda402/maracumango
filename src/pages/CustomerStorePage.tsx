import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Product } from '../types';
import { ProductCard } from '../components/customer/ProductCard';
import { SedesCard } from '../components/customer/SedesCard';

export const CustomerStorePage: React.FC = () => {
  const { products, categories: appCategories, sedes } = useApp();

  const visibleSedes = sedes.filter(
    (s) => !s.nombre.toLowerCase().includes('covaleda') && s.id !== 'sede-1795151700722'
  );
  const sedesCount = visibleSedes.length;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const activeCategories = appCategories.filter((c) => c.active !== false);

  const activeProducts = products.filter((p: Product) => p.active !== false);

  const filteredProducts =
    selectedCategoryId === 'all'
      ? activeProducts
      : activeProducts.filter((p: Product) => {
          const selectedCat = activeCategories.find((c) => c.id === selectedCategoryId);
          if (!selectedCat) return false;
          // Match by ID
          if (p.categoryId && p.categoryId === selectedCat.id) return true;
          // Match by name or normalized name (handling singular/plural, accents, case)
          const pCatName = (p.category || '').toLowerCase().trim();
          const targetName = selectedCat.name.toLowerCase().trim();
          if (pCatName === targetName) return true;
          if (pCatName.replace(/s$/, '') === targetName.replace(/s$/, '')) return true;
          return false;
        });

  return (
    <div className="w-full pt-20 bg-surface">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low/60 via-surface to-surface pb-space-3xl pt-space-xl">
        {/* Ambient Tropical Glows */}
        <div className="pointer-events-none absolute -top-24 -left-20 h-96 w-96 rounded-full bg-primary-container/15 blur-3xl"></div>
        <div className="pointer-events-none absolute top-1/4 -right-24 h-[420px] w-[420px] rounded-full bg-secondary-container/20 blur-3xl"></div>

        <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
            {/* Text Column */}
            <div className="lg:col-span-7 flex flex-col items-start gap-space-md z-10">
              <div className="inline-flex items-center gap-space-xs px-space-sm py-space-2xs rounded-full bg-surface-container-lowest shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-ping"></span>
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  ¡El calor de Neiva se apaga aquí!
                </span>
              </div>

              <h1 className="font-display-hero text-display-hero text-on-surface">
                El auténtico sabor{' '}
                <span className="text-primary-container">tropical de Neiva</span> en cada sorbo y bocado
              </h1>

              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
                Granizados artesanales, micheladas escarchadas con tajín y helados cremosos elaborados con pulpa 100% natural de maracuyá y mango biche huilense.
              </p>

              {/* Badges Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-xs w-full pt-space-xs">
                <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/10">
                  <span className="material-symbols-outlined text-primary-container text-[22px]">
                    storefront
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface truncate font-bold">
                      {sedesCount} {sedesCount === 1 ? 'Sede en Neiva' : 'Sedes en Neiva'}
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant truncate" title={visibleSedes.map((s) => s.nombre).join(', ')}>
                      {visibleSedes.length > 0
                        ? visibleSedes.map((s) => s.nombre.replace(/Sede\s+/i, '')).join(' • ')
                        : 'Encuéntranos en Neiva'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/10">
                  <span className="material-symbols-outlined text-tertiary text-[22px]">
                    moped
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface truncate">
                      Domicilios Flash
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      Fríos a tu puerta
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs p-space-xs rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/10 col-span-2 sm:col-span-1">
                  <span className="material-symbols-outlined text-secondary text-[22px]">
                    chat
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface truncate">
                      WhatsApp Directo
                    </span>
                    <span className="font-body-sm text-[11px] text-on-surface-variant">
                      Pedidos con tu cuenta
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Hero Banner */}
            <div className="lg:col-span-5 relative z-10">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-surface-container-lowest bg-gradient-to-br from-primary-container to-secondary-container p-6 text-on-primary">
                <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-10">
                  <span className="material-symbols-outlined text-[160px]">local_drink</span>
                </div>

                <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-label-sm uppercase tracking-wider mb-4">
                  ★ Los Más Pedidos en Neiva
                </span>

                <h2 className="font-headline-lg text-headline-lg text-white mb-2">
                  Maracumango Especial
                </h2>
                <p className="font-body-md text-white/90 mb-6">
                  Prueba la combinación perfecta entre la acidez del maracuyá y el dulzor crocante del mango biche con chamoy y tajín.
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider text-white/80">Precio</span>
                    <span className="font-headline-lg text-headline-lg font-bold text-white">
                      $14.000
                    </span>
                  </div>

                  <a
                    href="#menu-section"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-full bg-white text-primary font-label-lg shadow-lg hover:bg-surface-container-lowest transition-all cursor-pointer"
                  >
                    Ver Menú Completo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog & Menu Section */}
      <section id="menu-section" className="scroll-mt-24 py-space-2xl max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-xl">
          <div>
            <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-full bg-primary-container/15 text-primary font-label-sm uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-[16px]">restaurant_menu</span>
              Catálogo de Especialidades
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Nuestras Frutas y Refrescos Artesanales
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
              Selecciona tu producto favorito, ajusta cantidades y prepárate para disfrutar.
            </p>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-space-xs overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-5 py-2.5 rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all ${
                selectedCategoryId === 'all'
                  ? 'bg-on-surface text-surface shadow-md font-bold'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Todos
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-5 py-2.5 rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-on-surface text-surface shadow-md font-bold'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-lg">
          {filteredProducts.map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Sedes Section Banner */}
      <section className="py-space-2xl max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
        <SedesCard />
      </section>
    </div>
  );
};
