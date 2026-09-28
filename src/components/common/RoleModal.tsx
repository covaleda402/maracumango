import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const RoleModal: React.FC = () => {
  const {
    isRoleModalOpen,
    setIsRoleModalOpen,
    currentUser,
    setUserRole,
    login,
    logout,
    setActiveTab,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isRoleModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(cleanEmail, password);
      if (result.success) {
        setIsRoleModalOpen(false);
        setEmail('');
        setPassword('');
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas o cuenta no encontrada.');
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleContinueAsCustomer = () => {
    if (currentUser) {
      logout();
    } else {
      setUserRole('customer');
      setActiveTab('inicio');
    }
    setIsRoleModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md p-6 bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight">
                {currentUser ? 'Cuenta de Usuario' : 'Iniciar Sesión'}
              </h2>
              <p className="text-body-sm text-on-surface-variant text-xs">
                Portal Maracumango Neiva
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRoleModalOpen(false)}
            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Cerrar ventana"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* If user is already authenticated */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Sesión Activa
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-primary-container text-on-primary'
                  }`}
                >
                  {currentUser.role === 'ADMIN' ? 'Administrador' : 'Trabajador'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
                  {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-headline-sm text-base text-on-surface truncate font-semibold">
                    {currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()}
                  </h3>
                  <p className="text-body-sm text-xs text-on-surface-variant truncate">
                    {currentUser.email}
                  </p>
                  {currentUser.branchName && (
                    <p className="text-[11px] text-primary font-medium mt-0.5">
                      📍 {currentUser.branchName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (currentUser.role === 'ADMIN') {
                    setUserRole('admin');
                    setActiveTab('dashboard-admin');
                  } else {
                    setUserRole('worker');
                    setActiveTab('pedidos-trabajador');
                  }
                  setIsRoleModalOpen(false);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-primary-container text-on-primary font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-primary hover:text-on-primary transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {currentUser.role === 'ADMIN' ? 'dashboard' : 'blender'}
                </span>
                <span>Ir a mi Panel de {currentUser.role === 'ADMIN' ? 'Administración' : 'Trabajador'}</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  setIsRoleModalOpen(false);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-error-container/20 text-error hover:bg-error-container/40 font-label-md font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div className="space-y-4">
            <p className="text-body-sm text-on-surface-variant text-xs">
              Ingresa tus credenciales del equipo operativo o administrativo de Maracumango.
            </p>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3 rounded-2xl bg-error-container/30 border border-error/20 flex items-start gap-2.5 text-error animate-fadeIn">
                <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">error</span>
                <p className="text-xs font-medium leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    mail
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@maracumango.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1"
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-primary-container text-on-primary font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-primary active:scale-98 transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    <span>Entrar al Sistema</span>
                  </>
                )}
              </button>
            </form>



            {/* Continue as Customer */}
            <div className="pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={handleContinueAsCustomer}
                className="w-full py-2.5 px-4 rounded-2xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-xs font-semibold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">storefront</span>
                <span>Continuar Navegando como Cliente</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
