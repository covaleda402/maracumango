import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Product, OrderStatus } from '../types';
import { ProductFormModal } from '../components/admin/ProductFormModal';
import { BusinessConfigForm } from '../components/admin/BusinessConfigForm';
import { CategoryManager } from '../components/admin/CategoryManager';
import { StaffManager } from '../components/admin/StaffManager';
import { SEDES, getSedeById } from '../data/sedes';

export const AdminDashboardPage: React.FC = () => {
  const {
    orders,
    products,
    categories,
    toggleProductActive,
    deleteProduct,
    updateOrderStatus,
    acceptOrder,
    cancelOrder,
    setActiveTab,
    setUserRole,
    setIsRoleModalOpen,
    config,
    adminSedeId,
    setAdminSedeId,
    currentUser,
    logout,
    downloadSalesReport,
  } = useApp();

  const [activeAdminSubtab, setActiveAdminSubtab] = useState<
    'dashboard' | 'pedidos' | 'productos' | 'categorias' | 'personal' | 'configuracion'
  >('dashboard');

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('Todos');
  const [productFeedback, setProductFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Order filters for Pedidos tab
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('Todos');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState<string>('Todos');

  // Filter orders by Admin selected Sede
  const adminOrders =
    adminSedeId === 'all'
      ? orders
      : orders.filter((o) => o.sedeId === adminSedeId);

  // Business Rule: Canceled orders MUST NOT count as sales or valid orders!
  const validOrders = adminOrders.filter(
    (o) => (o.status as string) !== 'CANCELLED' && (o.status as string) !== 'Cancelado'
  );

  // KPI Calculations (Strictly on valid orders)
  const totalSales = validOrders.reduce((sum, ord) => sum + ord.total, 0);
  const totalOrdersCount = validOrders.length;
  const averageTicket = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;
  const activeProductsCount = products.filter((p) => p.active !== false).length;

  const countPending = adminOrders.filter(
    (o) => o.status === 'Pendiente' || o.status === 'PENDING_ADMIN'
  ).length;
  const countAprobados = adminOrders.filter((o) => o.status === 'ACCEPTED').length;
  const countPreparing = adminOrders.filter(
    (o) => o.status === 'En preparación' || o.status === 'PREPARING'
  ).length;
  const countReady = adminOrders.filter((o) => o.status === 'Listo' || o.status === 'READY').length;
  const countDelivered = adminOrders.filter((o) => o.status === 'Entregado' || o.status === 'DELIVERED').length;
  const countDomicilio = validOrders.filter((o) => o.deliveryMethod === 'domicilio').length;
  const countRecoger = validOrders.filter((o) => o.deliveryMethod === 'recoger').length;

  const handleOpenAddModal = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (
      !window.confirm(
        `¿Estás seguro de eliminar el producto "${prod.name}"?\n\nSi tiene pedidos históricos asociados, será desactivado de forma segura para preservar los reportes y estadísticas.`
      )
    ) {
      return;
    }
    const res = await deleteProduct(prod.id);
    if (res.success) {
      setProductFeedback({
        type: 'success',
        message:
          res.deleted
            ? `El producto "${prod.name}" fue eliminado permanentemente de la base de datos.`
            : `El producto "${prod.name}" tiene pedidos históricos y fue desactivado de forma segura del catálogo.`,
      });
      setTimeout(() => setProductFeedback(null), 6000);
    } else {
      setProductFeedback({
        type: 'error',
        message: res.message || 'No se pudo eliminar el producto.',
      });
    }
  };

  const handleDownloadCsv = async () => {
    setIsExportingCsv(true);
    try {
      const ok = await downloadSalesReport(adminSedeId);
      if (!ok) {
        alert('No se pudo generar el reporte en este momento.');
      }
    } catch {
      alert('Error al descargar el archivo.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  const filteredProducts =
    productCategoryFilter === 'Todos'
      ? products
      : products.filter((p) => {
          const selectedCat = categories.find(
            (c) => c.name === productCategoryFilter || c.id === productCategoryFilter
          );
          if (!selectedCat) return p.category === productCategoryFilter;
          if (p.categoryId && p.categoryId === selectedCat.id) return true;
          const pName = (p.category || '').toLowerCase().trim();
          const tName = selectedCat.name.toLowerCase().trim();
          return pName === tName || pName.replace(/s$/, '') === tName.replace(/s$/, '');
        });

  // Filtered orders for table
  const filteredOrdersTable = adminOrders.filter((ord) => {
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      ord.customerPhone.includes(orderSearch);

    let matchesStatus = true;
    if (orderStatusFilter === 'Todos') {
      matchesStatus = true;
    } else if (orderStatusFilter === 'APROBADOS') {
      matchesStatus = ord.status === 'ACCEPTED';
    } else if (orderStatusFilter === 'EN PREPARACIÓN') {
      matchesStatus = ord.status === 'PREPARING' || ord.status === 'En preparación';
    } else if (orderStatusFilter === 'LISTOS') {
      matchesStatus = ord.status === 'READY' || ord.status === 'Listo';
    } else if (orderStatusFilter === 'ENTREGADOS') {
      matchesStatus = ord.status === 'DELIVERED' || ord.status === 'Entregado';
    } else if (orderStatusFilter === 'CANCELADOS') {
      matchesStatus = ord.status === 'CANCELLED' || (ord.status as string) === 'Cancelado';
    } else if (orderStatusFilter === 'Pendiente') {
      matchesStatus = ord.status === 'PENDING_ADMIN' || ord.status === 'Pendiente';
    } else {
      matchesStatus = ord.status === orderStatusFilter;
    }

    const matchesDelivery =
      orderDeliveryFilter === 'Todos' || ord.deliveryMethod === orderDeliveryFilter;
    return matchesSearch && matchesStatus && matchesDelivery;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pendiente':
      case 'PENDING_ADMIN':
        return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
      case 'ACCEPTED':
      case 'En preparación':
      case 'PREPARING':
        return 'bg-primary-container/20 text-primary border-primary/30';
      case 'Listo':
      case 'READY':
        return 'bg-tertiary-container/20 text-tertiary border-tertiary/30';
      case 'Entregado':
      case 'DELIVERED':
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
      case 'CANCELLED':
        return 'bg-error-container/20 text-error border-error/30';
      default:
        return 'bg-surface-container text-on-surface';
    }
  };


  return (
    <div className="min-h-screen bg-surface flex">
      {/* Admin Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low shadow-[0_4px_20px_rgba(0,0,0,0.04)] z-40 flex flex-col pt-space-md pb-space-lg hidden md:flex">
        <div className="px-space-md mb-space-lg flex items-center">
          <img
            src={config.logoUrl || '/logo-maracumango.png'}
            alt={config.businessName || 'Maracumango'}
            className="h-10 w-auto object-contain"
            style={{ maxWidth: '150px' }}
          />
        </div>

        <nav className="flex-1 px-space-xs space-y-space-2xs">
          <button
            onClick={() => setActiveAdminSubtab('dashboard')}
            className={`w-full flex items-center gap-space-xs px-space-sm py-space-xs font-label-lg rounded-xl text-left transition-all ${
              activeAdminSubtab === 'dashboard'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">space_dashboard</span>
            <span>Dashboard & Ventas</span>
          </button>

          <button
            onClick={() => setActiveAdminSubtab('pedidos')}
            className={`w-full flex items-center gap-space-xs px-space-sm py-space-xs font-label-lg rounded-xl text-left transition-all ${
              activeAdminSubtab === 'pedidos'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            <span>Gestión de Pedidos</span>
          </button>

          <button
            onClick={() => setActiveAdminSubtab('productos')}
            className={`w-full flex items-center gap-space-xs px-space-sm py-space-xs font-label-lg rounded-xl text-left transition-all ${
              activeAdminSubtab === 'productos'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">fastfood</span>
            <span>Catálogo / Productos</span>
          </button>

          <button
            onClick={() => setActiveAdminSubtab('categorias')}
            className={`w-full flex items-center gap-space-xs px-space-sm py-space-xs font-label-lg rounded-xl text-left transition-all ${
              activeAdminSubtab === 'categorias'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">category</span>
            <span>Categorías Menú</span>
          </button>

          <button
            onClick={() => setActiveAdminSubtab('personal')}
            className={`w-full flex items-center gap-space-xs px-space-sm py-space-xs font-label-lg rounded-xl text-left transition-all ${
              activeAdminSubtab === 'personal'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">badge</span>
            <span>Equipo & Personal</span>
          </button>

          <button
            onClick={() => setActiveAdminSubtab('configuracion')}
            className={`w-full flex items-center gap-space-xs px-space-sm py-space-xs font-label-lg rounded-xl text-left transition-all ${
              activeAdminSubtab === 'configuracion'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span>Configuración Negocio</span>
          </button>
        </nav>

        <div className="px-space-md pt-space-xs border-t border-outline-variant/30">
          <button
            onClick={() => {
              setUserRole('customer');
              setActiveTab('inicio');
            }}
            className="flex items-center gap-space-xs text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Volver a la Tienda</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Body */}
      <div className="flex-1 md:pl-64 w-full">
        {/* Top Sticky Header with Sede Switcher */}
        <header className="sticky top-0 bg-surface/90 backdrop-blur-xl shadow-sm z-30 flex flex-wrap items-center justify-between px-space-lg py-3 gap-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Logo on mobile only (since sidebar is hidden on mobile) */}
            <img
              src={config.logoUrl || '/logo-maracumango.png'}
              alt={config.businessName || 'Maracumango'}
              className="h-8 w-auto md:hidden object-contain"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-label-lg text-label-lg text-on-surface-variant hidden sm:inline">Sede Admin:</span>
              <div className="flex items-center gap-2">
                <select
                  value={adminSedeId}
                  onChange={(e) => setAdminSedeId(e.target.value)}
                  className="font-label-lg text-label-md text-on-surface bg-surface-container px-3.5 py-1.5 rounded-full border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold cursor-pointer"
                >
                  <option value="all">Todas las Sedes (Consolidado)</option>
                  {SEDES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>

                {adminSedeId !== 'all' && (
                  <span className="text-xs text-primary font-medium hidden lg:flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">store</span>
                    WhatsApp: +57 {getSedeById(adminSedeId).whatsapp}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* User Profile & Logout Button */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRoleModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all text-xs font-semibold border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">admin_panel_settings</span>
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
                title="Cambiar rol de usuario"
              >
                <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                <span>Rol: Admin</span>
              </button>
            )}
          </div>
        </header>

        <main className="p-space-lg space-y-space-lg">
          {/* Operational Header Bar - Cleaned per Point 22 */}
          <div className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-[0_4px_24px_-2px_rgba(106,191,0,0.10)] border border-outline-variant/15 flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
            <div className="flex items-start md:items-center gap-space-md">
              <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary shrink-0 shadow-inner">
                <span className="material-symbols-outlined text-[32px]">storefront</span>
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-space-xs mb-1">
                  <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span> En Servicio Activo
                  </span>
                  <span className="font-label-md text-label-md text-on-surface-variant">Neiva, Huila</span>
                </div>
                <p className="font-headline-sm text-headline-sm text-on-surface">
                  Turnos de Operación: {config.shiftInfo}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary-container">check_circle</span>
                  Sedes operativas: <strong className="text-on-surface">Parque del Amor y la Amistad & Sector Edsbur / Único</strong>
                </p>
              </div>
            </div>
          </div>

          {/* KPI Cards Row - Cleaned 3-Card Layout per Point 23 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {/* KPI 1: Ventas */}
            <div className="bg-surface-container-lowest rounded-3xl p-space-md shadow-sm border border-outline-variant/15 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Ventas Acumuladas
                </span>
                <span className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </span>
              </div>
              <h3 className="font-display-hero text-headline-lg text-on-surface font-bold">
                ${totalSales.toLocaleString('es-CO')}
              </h3>
              <p className="font-body-sm text-body-sm text-tertiary flex items-center gap-1 mt-2">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                <span>{adminSedeId === 'all' ? 'Consolidado general' : getSedeById(adminSedeId).nombre}</span>
              </p>
            </div>

            {/* KPI 2: Pedidos */}
            <div className="bg-surface-container-lowest rounded-3xl p-space-md shadow-sm border border-outline-variant/15 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Total Pedidos
                </span>
                <span className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </span>
              </div>
              <h3 className="font-display-hero text-headline-lg text-on-surface font-bold">
                {totalOrdersCount}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                {countDomicilio} Domicilio | {countRecoger} Recoger
              </p>
            </div>

            {/* KPI 3: Ticket Promedio */}
            <div className="bg-surface-container-lowest rounded-3xl p-space-md shadow-sm border border-outline-variant/15 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  Ticket Promedio
                </span>
                <span className="w-9 h-9 rounded-xl bg-surface-container-high flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[20px]">query_stats</span>
                </span>
              </div>
              <h3 className="font-display-hero text-headline-lg text-on-surface font-bold">
                ${averageTicket.toLocaleString('es-CO')}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                {activeProductsCount} productos activos en tienda
              </p>
            </div>
          </div>

          {/* SUBTAB 1: DASHBOARD REAL */}
          {activeAdminSubtab === 'dashboard' && (
            <div className="space-y-space-lg">
              {/* Pipeline Breakdown */}
              <div className="bg-surface-container-lowest rounded-3xl p-space-md border border-outline-variant/15 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Flujo de Pedidos en Operación
                  </h3>
                  <span className="text-xs text-on-surface-variant font-medium">Estado actual en tiempo real</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col">
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold uppercase">Pendientes</span>
                    <span className="text-2xl font-bold text-on-surface">{countPending}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col">
                    <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Aprobados</span>
                    <span className="text-2xl font-bold text-on-surface">{countAprobados}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-primary-container/20 border border-primary/20 flex flex-col">
                    <span className="text-xs text-primary font-semibold uppercase">En Preparación</span>
                    <span className="text-2xl font-bold text-on-surface">{countPreparing}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-tertiary-container/20 border border-tertiary/20 flex flex-col">
                    <span className="text-xs text-tertiary font-semibold uppercase">Listos</span>
                    <span className="text-2xl font-bold text-on-surface">{countReady}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-container border border-outline-variant/30 flex flex-col">
                    <span className="text-xs text-on-surface-variant font-semibold uppercase">Entregados</span>
                    <span className="text-2xl font-bold text-on-surface">{countDelivered}</span>
                  </div>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="bg-surface-container-lowest rounded-3xl p-space-md border border-outline-variant/15 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      Últimos Pedidos Registrados
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Visualiza rápidamente las órdenes más recientes y sus detalles
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveAdminSubtab('pedidos')}
                    className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Ver Tabla Completa</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant text-xs font-semibold uppercase border-b border-outline-variant/20">
                        <th className="p-3">Código</th>
                        <th className="p-3">Cliente</th>
                        <th className="p-3">Sede</th>
                        <th className="p-3">Tipo Entrega</th>
                        <th className="p-3">Total</th>
                        <th className="p-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                      {adminOrders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-surface-container-low/40">
                          <td className="p-3 font-mono font-bold text-primary whitespace-nowrap">
                            {order.orderNumber}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-on-surface">{order.customerName}</div>
                            <div className="text-xs text-on-surface-variant">{order.customerPhone}</div>
                          </td>
                          <td className="p-3 text-xs text-on-surface-variant">
                            {order.sedeNombre?.replace('Sede ', '') || 'Sede Principal'}
                          </td>
                          <td className="p-3 text-xs">
                            <span className="capitalize">{order.deliveryMethod}</span>
                          </td>
                          <td className="p-3 font-bold text-on-surface">
                            ${order.total.toLocaleString('es-CO')}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: GESTIÓN DE PEDIDOS (TABLA ADMINISTRATIVA COMPLETA) */}
          {activeAdminSubtab === 'pedidos' && (
            <div className="space-y-space-md">
              {/* Retention Policy Banner with CSV Export (Points 20 & 21) */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-on-surface shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-[24px] mt-0.5 shrink-0">info</span>
                  <div className="text-xs space-y-0.5">
                    <strong className="text-amber-800 dark:text-amber-300 font-semibold block text-sm">
                      Política de Conservación & Reporte de Ventas
                    </strong>
                    <p className="text-on-surface-variant">
                      Los pedidos cancelados se conservan durante <strong>30 días</strong> y los pedidos entregados durante <strong>3 meses</strong> para estadísticas comerciales. Los registros más antiguos se depuran automáticamente. Descarga el reporte antes de su eliminación programada.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadCsv}
                  disabled={isExportingCsv}
                  className="shrink-0 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold border border-outline-variant/30 flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  title="Descargar reporte completo en formato CSV para Excel"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">download</span>
                  <span>{isExportingCsv ? 'Generando...' : 'Descargar Reporte CSV'}</span>
                </button>
              </div>

              {/* Top Search and Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    Gestión de Pedidos
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    {filteredOrdersTable.length} pedidos encontrados para la vista actual.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant">
                      search
                    </span>
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Buscar cliente, código..."
                      className="pl-9 pr-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary w-48"
                    />
                  </div>

                  <select
                    value={orderDeliveryFilter}
                    onChange={(e) => setOrderDeliveryFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-medium text-on-surface focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">Todas las Entregas</option>
                    <option value="domicilio">Domicilio</option>
                    <option value="recoger">Recoger en Tienda</option>
                  </select>
                </div>
              </div>

              {/* Point 16: Unified Main Filter Pills at the top */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'Todos', label: 'TODOS', count: adminOrders.length },
                  { id: 'Pendiente', label: countPending > 0 ? '🔥 POR APROBAR' : 'POR APROBAR', count: countPending, highlight: countPending > 0 },
                  { id: 'APROBADOS', label: 'APROBADOS', count: countAprobados },
                  { id: 'EN PREPARACIÓN', label: 'EN PREPARACIÓN', count: countPreparing },
                  { id: 'LISTOS', label: 'LISTOS', count: countReady },
                  { id: 'ENTREGADOS', label: 'ENTREGADOS', count: countDelivered },
                  { id: 'CANCELADOS', label: 'CANCELADOS', count: adminOrders.length - validOrders.length },
                ].map((tab) => {
                  const isActive = orderStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setOrderStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl font-label-md text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-primary-container text-on-primary shadow-sm'
                          : tab.highlight
                          ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30 hover:bg-amber-500/25 animate-pulse'
                          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : tab.highlight
                            ? 'bg-amber-500 text-white font-bold'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Full Orders Table */}
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-xs uppercase border-b border-outline-variant/20">
                        <th className="p-4">Código</th>
                        <th className="p-4">Fecha / Hora</th>
                        <th className="p-4">Cliente</th>
                        <th className="p-4">Sede</th>
                        <th className="p-4">Entrega</th>
                        <th className="p-4">Pago</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Estado (Acción)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                      {filteredOrdersTable.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-on-surface-variant">
                            No se encontraron pedidos con los criterios de búsqueda.
                          </td>
                        </tr>
                      ) : (
                        filteredOrdersTable.map((order) => {
                          const formattedDate = new Date(order.createdAt).toLocaleString('es-CO', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });

                          return (
                            <tr key={order.id} className="hover:bg-surface-container-low/40 transition-colors">
                              <td className="p-4 font-mono font-bold text-primary whitespace-nowrap">
                                {order.orderNumber}
                              </td>
                              <td className="p-4 text-xs text-on-surface-variant whitespace-nowrap">
                                {formattedDate}
                              </td>
                              <td className="p-4">
                                <div className="font-semibold text-on-surface">{order.customerName}</div>
                                <a
                                  href={`https://wa.me/57${order.customerPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-tertiary hover:underline flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">chat</span>
                                  {order.customerPhone}
                                </a>
                              </td>
                              <td className="p-4 text-xs text-on-surface-variant whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-md bg-surface-container border border-outline-variant/20">
                                  {order.sedeNombre ? order.sedeNombre.replace('Sede ', '') : 'Principal'}
                                </span>
                              </td>
                              <td className="p-4 text-xs">
                                <div className="flex items-center gap-1 font-medium capitalize">
                                  <span className="material-symbols-outlined text-[16px] text-primary">
                                    {order.deliveryMethod === 'domicilio' ? 'moped' : 'storefront'}
                                  </span>
                                  <span>{order.deliveryMethod}</span>
                                </div>
                                {order.deliveryAddress && (
                                  <div className="text-[11px] text-on-surface-variant truncate max-w-xs mt-0.5">
                                    {order.deliveryAddress}
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-xs">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container font-semibold capitalize">
                                  {order.paymentMethod}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-primary whitespace-nowrap">
                                ${order.total.toLocaleString('es-CO')}
                              </td>
                              <td className="p-4">
                                {order.status === 'PENDING_ADMIN' || order.status === 'Pendiente' ? (
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <button
                                      onClick={() => acceptOrder(order.id)}
                                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                                      title="Confirmar y aprobar pedido para cocina"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                      <span>✓ Aprobar Pedido</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Estás seguro de cancelar o rechazar el pedido ${order.orderNumber}?`)) {
                                          cancelOrder(order.id);
                                        }
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
                                      title="Rechazar pedido"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                                      <span>Rechazar</span>
                                    </button>
                                  </div>
                                ) : (order.status as string) === 'CANCELLED' || (order.status as string) === 'Cancelado' ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300">
                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                    CANCELADO
                                  </span>
                                ) : (order.status as string) === 'ACCEPTED' || (order.status as string) === 'Aceptado' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-500/30">
                                      <span className="material-symbols-outlined text-[15px]">schedule</span>
                                      <span>Aprobado (Esperando Barra)</span>
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Deseas cancelar el pedido ${order.orderNumber}?`)) {
                                          cancelOrder(order.id);
                                        }
                                      }}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Cancelar pedido"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">block</span>
                                    </button>
                                  </div>
                                ) : (order.status as string) === 'PREPARING' || (order.status as string) === 'En preparación' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-500/30">
                                      <span className="material-symbols-outlined text-[15px] animate-spin">autorenew</span>
                                      <span>En Preparación {order.preparedByName ? `(${order.preparedByName})` : ''}</span>
                                    </span>
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Deseas cancelar el pedido ${order.orderNumber}?`)) {
                                          cancelOrder(order.id);
                                        }
                                      }}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Cancelar pedido"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">block</span>
                                    </button>
                                  </div>
                                ) : (order.status as string) === 'READY' || (order.status as string) === 'Listo' ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-500/30">
                                      <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                      <span>Listo para Entrega</span>
                                    </span>
                                    <button
                                      onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                                      className="px-3 py-1.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-bold shadow-sm transition-all flex items-center gap-1 active:scale-95"
                                      title="Marcar pedido como entregado"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                                      <span>Entregar</span>
                                    </button>
                                  </div>
                                ) : (order.status as string) === 'DELIVERED' || (order.status as string) === 'Entregado' ? (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold border border-outline-variant/30">
                                    <span className="material-symbols-outlined text-[15px] text-emerald-600">done_all</span>
                                    <span>Entregado</span>
                                  </span>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${getStatusBadge(order.status)}`}>
                                      {order.status}
                                    </span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 3: PRODUCTOS */}
          {activeAdminSubtab === 'productos' && (
            <div className="space-y-space-md">
              {/* Product Feedback Alert (Point 4 & 5) */}
              {productFeedback && (
                <div
                  className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold shadow-sm ${
                    productFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">
                      {productFeedback.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <span>{productFeedback.message}</span>
                  </div>
                  <button
                    onClick={() => setProductFeedback(null)}
                    className="p-1 hover:opacity-75 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">
                    Gestión del Catálogo de Productos
                  </h2>
                  <p className="text-body-sm text-on-surface-variant">
                    Crea, edita, cambia precios o activa/desactiva productos del menú.
                  </p>
                </div>

                <div className="flex items-center gap-space-sm">
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface font-label-md focus:outline-none cursor-pointer"
                  >
                    <option value="Todos">Todas las Categorías</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleOpenAddModal}
                    className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-md hover:bg-primary transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Agregar Producto</span>
                  </button>
                </div>
              </div>

              {/* Products Admin Table */}
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/20 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md border-b border-outline-variant/20">
                        <th className="p-4">Producto</th>
                        <th className="p-4">Categoría</th>
                        <th className="p-4">Precio</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 text-body-sm">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                            No se encontraron productos para esta categoría.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((prod) => (
                          <tr key={prod.id} className="hover:bg-surface-container-low/50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-12 h-12 rounded-xl object-cover bg-surface-container"
                                />
                                <div>
                                  <div className="font-label-lg text-on-surface">{prod.name}</div>
                                  <div className="text-on-surface-variant text-xs line-clamp-1 max-w-xs">
                                    {prod.description}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 font-label-md text-on-surface">{prod.category}</td>
                            <td className="p-4 font-bold text-primary">
                              ${prod.price.toLocaleString('es-CO')}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => toggleProductActive(prod.id)}
                                className={`px-3 py-1 rounded-full font-label-sm text-[11px] font-bold border transition-colors ${
                                  prod.active
                                    ? 'bg-tertiary-container/15 text-tertiary border-tertiary/20'
                                    : 'bg-error-container/20 text-error border-error/20'
                                }`}
                              >
                                {prod.active ? 'Activo' : 'Inactivo'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEditModal(prod)}
                                  className="p-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                                  title="Editar"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod)}
                                  className="p-2 rounded-xl bg-surface-container text-error hover:bg-error-container/20 transition-colors"
                                  title="Eliminar producto"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 4: CATEGORÍAS */}
          {activeAdminSubtab === 'categorias' && <CategoryManager />}

          {/* SUBTAB 5: EQUIPO & PERSONAL */}
          {activeAdminSubtab === 'personal' && <StaffManager />}

          {/* SUBTAB 6: CONFIGURACIÓN */}
          {activeAdminSubtab === 'configuracion' && <BusinessConfigForm />}
        </main>
      </div>

      {/* Modal for Add / Edit product */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />
    </div>
  );
};

