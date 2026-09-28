import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkerOrderCard } from '../components/worker/WorkerOrderCard';
import { SEDES, getSedeById } from '../data/sedes';

export const WorkerPanelPage: React.FC = () => {
  const {
    orders,
    setActiveTab,
    setUserRole,
    setIsRoleModalOpen,
    config,
    workerSedeId,
    setWorkerSedeId,
    sedes,
    currentUser,
    logout,
  } = useApp();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('Todos');

  const branchesList = sedes.length > 0 ? sedes : SEDES;
  const activeSede = branchesList.find((s) => s.id === workerSedeId) || getSedeById(workerSedeId);

  // Business Rule:
  // 1. Worker only sees orders for their assigned operational sede.
  // 2. Worker CANNOT see orders in 'PENDING_ADMIN' / 'Pendiente' until admin confirms/approves them.
  const approvedSedeOrders = orders.filter((o) => {
    const isThisSede = o.sedeId === workerSedeId;
    const isApproved =
      o.status !== 'PENDING_ADMIN' &&
      o.status !== 'Pendiente' &&
      o.status !== 'CANCELLED';
    return isThisSede && isApproved;
  });

  const approvedCount = approvedSedeOrders.filter(
    (o) => o.status === 'ACCEPTED' || (o.status as string) === 'Aceptado'
  ).length;
  const preparingCount = approvedSedeOrders.filter(
    (o) => o.status === 'PREPARING' || o.status === 'En preparación'
  ).length;
  const readyCount = approvedSedeOrders.filter(
    (o) => o.status === 'Listo' || o.status === 'READY'
  ).length;
  const deliveredCount = approvedSedeOrders.filter(
    (o) => o.status === 'Entregado' || o.status === 'DELIVERED'
  ).length;

  const filteredOrders =
    selectedStatusFilter === 'Todos'
      ? approvedSedeOrders
      : approvedSedeOrders.filter((o) => {
          if (selectedStatusFilter === 'Por Preparar') {
            return o.status === 'ACCEPTED' || (o.status as string) === 'Aceptado';
          }
          if (selectedStatusFilter === 'En preparación') {
            return o.status === 'En preparación' || o.status === 'PREPARING';
          }
          if (selectedStatusFilter === 'Listo') {
            return o.status === 'Listo' || o.status === 'READY';
          }
          if (selectedStatusFilter === 'Entregado') {
            return o.status === 'Entregado' || o.status === 'DELIVERED';
          }
          return o.status === selectedStatusFilter;
        });

  const activeWhatsapp =
    workerSedeId === 'sede-2'
      ? config.sede2Whatsapp || activeSede.whatsapp || '3219759794'
      : config.sede1Whatsapp || activeSede.whatsapp || '3177401873';

  const handleReturnToStore = () => {
    setUserRole('customer');
    setActiveTab('inicio');
  };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar Navigation without duplicate sede selector */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low shadow-[0_4px_20px_rgba(0,0,0,0.04)] z-40 flex flex-col pt-space-md pb-space-lg hidden md:flex">
        <div className="px-space-md mb-space-lg flex items-center">
          <img
            src={config.logoUrl || '/logo-maracumango.png'}
            alt={config.businessName || 'Maracumango'}
            className="h-10 w-auto object-contain"
            style={{ maxWidth: '150px' }}
          />
        </div>

        {/* Dynamic Shift Badge */}
        <div className="px-space-md mb-space-sm">
          <div className="p-space-xs bg-surface-container rounded-xl flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container animate-pulse"></span>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface">Turno Activo</p>
              <p className="text-[11px] text-on-surface-variant font-medium">
                {workerSedeId === 'sede-2'
                  ? 'Jornada Continua: 10:00 AM - 10:00 PM'
                  : 'Turno 2: 2:30 PM - 11:00 PM'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Info Banner */}
        <div className="px-space-md mb-space-md">
          <div className="p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-xs space-y-1">
            <p className="font-semibold text-primary flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>Pedidos Aprobados</span>
            </p>
            <p className="text-[11px] text-on-surface-variant">
              Solo se muestran pedidos confirmados por el administrador.
            </p>
          </div>
        </div>

        <nav className="flex-1 px-space-xs space-y-space-2xs">
          <button
            onClick={() => setSelectedStatusFilter('Todos')}
            className="w-full flex items-center gap-space-xs px-space-sm py-space-xs bg-primary-container text-on-primary font-label-lg rounded-xl text-left shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span>Monitor de Preparación</span>
          </button>
        </nav>

        {/* Return to Store link */}
        <div className="px-space-md pt-space-md border-t border-outline-variant/20">
          <button
            onClick={handleReturnToStore}
            className="w-full flex items-center gap-space-xs px-space-sm py-space-xs text-on-surface-variant hover:text-primary transition-colors text-xs font-label-md"
          >
            <span className="material-symbols-outlined text-[18px]">storefront</span>
            <span>Volver a la Tienda</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Top Operational Header with Unified Sede Filter */}
        <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md h-20 px-space-lg flex items-center justify-between border-b border-outline-variant/20 shadow-xs">
          <div className="flex items-center gap-space-md">
            {/* OPERATIONAL SEDE BADGE OR SELECTOR */}
            {currentUser?.role === 'WORKER' ? (
              <div className="flex items-center gap-2 bg-primary-container/15 px-3.5 py-1.5 rounded-2xl border border-primary/30">
                <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
                <span className="text-xs font-semibold text-on-surface">
                  Sede Asignada:
                </span>
                <span className="text-xs font-bold text-primary">
                  {activeSede.nombre}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-2xl border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-[18px]">store</span>
                <span className="text-xs font-semibold text-on-surface hidden sm:inline">
                  Sede Operativa:
                </span>
                <select
                  value={workerSedeId}
                  onChange={(e) => setWorkerSedeId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-primary focus:outline-none cursor-pointer"
                >
                  {branchesList.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-space-xs">
            <a
              href={`https://wa.me/57${activeWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant hover:text-primary transition-colors text-xs font-medium border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>WhatsApp ({activeWhatsapp})</span>
            </a>

            {/* User Profile & Logout Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all text-xs font-semibold border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">badge</span>
                  <span>{currentUser.firstName || currentUser.name}</span>
                </button>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-full text-error hover:bg-error-container/20 transition-colors"
                  title="Cerrar sesión"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all font-label-md text-xs border border-outline-variant/30"
                title="Iniciar sesión"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Ingresar</span>
              </button>
            )}
          </div>
        </header>

        {/* Operational Dashboard */}
        <main className="p-space-lg space-y-space-lg">
          {/* Operational Metrics Bar */}
          <section className="w-full bg-surface-container-lowest rounded-3xl p-space-md shadow-md border border-outline-variant/15">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-14 h-14 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[32px]">blender</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-tertiary text-on-tertiary font-label-sm uppercase">
                      <span className="w-2 h-2 rounded-full bg-tertiary-fixed animate-pulse"></span> Barra Activa
                    </span>
                    <span className="text-on-surface-variant font-label-md">
                      Sede: <strong className="text-on-surface">{activeSede.nombre}</strong>
                    </span>
                  </div>
                  <h1 className="font-headline-md text-headline-md text-on-surface flex items-center gap-space-xs">
                    <span>Estación de Preparación de Pedidos</span>
                  </h1>
                </div>
              </div>

              {/* Status Counters (Workers only see approved orders) */}
              <div className="flex items-center gap-space-xs flex-wrap">
                <button
                  onClick={() => setSelectedStatusFilter('Por Preparar')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all border ${
                    selectedStatusFilter === 'Por Preparar'
                      ? 'bg-secondary-container text-on-secondary-container font-bold border-secondary'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">assignment</span>
                  <span className="font-headline-sm">{approvedCount}</span>
                  <span className="font-label-sm uppercase">Por Preparar</span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('En preparación')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all border ${
                    selectedStatusFilter === 'En preparación'
                      ? 'bg-primary-container text-on-primary font-bold border-primary-container'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-primary animate-spin">autorenew</span>
                  <span className="font-headline-sm">{preparingCount}</span>
                  <span className="font-label-sm uppercase">En Preparación</span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('Listo')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all border ${
                    selectedStatusFilter === 'Listo'
                      ? 'bg-tertiary-container text-on-tertiary font-bold border-tertiary-container'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
                  <span className="font-headline-sm">{readyCount}</span>
                  <span className="font-label-sm uppercase">Listos</span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('Entregado')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all border ${
                    selectedStatusFilter === 'Entregado'
                      ? 'bg-on-surface text-surface font-bold border-on-surface'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span className="font-headline-sm">{deliveredCount}</span>
                  <span className="font-label-sm uppercase">Entregados</span>
                </button>
              </div>
            </div>
          </section>

          {/* Filter Bar & Orders Grid */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Pedidos para Preparar en Sede ({filteredOrders.length})
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedStatusFilter('Todos')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedStatusFilter === 'Todos'
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Todos los Aprobados
              </button>
              <button
                onClick={() => setSelectedStatusFilter('Por Preparar')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedStatusFilter === 'Por Preparar'
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Por Preparar ({approvedCount})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('En preparación')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedStatusFilter === 'En preparación'
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                En Preparación ({preparingCount})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('Listo')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedStatusFilter === 'Listo'
                    ? 'bg-tertiary-container text-on-tertiary'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Listos ({readyCount})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('Entregado')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  selectedStatusFilter === 'Entregado'
                    ? 'bg-on-surface text-surface'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                Entregados ({deliveredCount})
              </button>
            </div>
          </div>

          {/* Orders Grid */}
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/20 space-y-3">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px]">checklist</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                No hay pedidos en esta estación
              </h3>
              <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
                Los nuevos pedidos aparecerán aquí una vez que la administradora los revise y acepte.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
              {filteredOrders.map((order) => (
                <WorkerOrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
