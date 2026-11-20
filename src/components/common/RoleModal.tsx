import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiService } from '../../services/apiService';

export const RoleModal: React.FC = () => {
  const {
    isRoleModalOpen,
    setIsRoleModalOpen,
    setIsTermsModalOpen,
    currentUser,
    setUserRole,
    login,
    registerCustomer,
    updateCustomerProfile,
    logout,
    setActiveTab,
  } = useApp();

  // Tab: 'login' | 'register' | 'forgot'
  const [modalTab, setModalTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Password reset states
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);

  // Profile edit states (for logged in customers)
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setEditPhone(currentUser.phone || '');
      setEditAddress(currentUser.defaultAddress || '');
    }
  }, [currentUser]);

  if (!isRoleModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(cleanEmail, loginPassword);
      if (result.success) {
        setIsRoleModalOpen(false);
        setLoginEmail('');
        setLoginPassword('');
      } else {
        setErrorMessage(result.error || 'Credenciales inválidas o cuenta no encontrada.');
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }
    if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 7) {
      setErrorMessage('Por favor ingresa un número de WhatsApp o celular válido de al menos 7 dígitos.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage('Debes aceptar los Términos, Condiciones y Política de Habeas Data para continuar.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerCustomer({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        phone: regPhone.trim(),
        password: regPassword,
        defaultAddress: regAddress.trim() || undefined,
        acceptedTerms,
      });

      if (result.success) {
        setIsRoleModalOpen(false);
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegAddress('');
        setRegPassword('');
      } else {
        setErrorMessage(result.error || 'Error al crear la cuenta.');
      }
    } catch {
      setErrorMessage('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setGeneratedCodeHint(null);

    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Ingresa el correo electrónico asociado a tu cuenta.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.forgotPassword(cleanEmail);
      if (res.success) {
        setResetStep(2);
        setResetCode('');
        setGeneratedCodeHint(
          'Hemos enviado un código de verificación de 6 dígitos a tu correo electrónico registrado. Por favor búscalo en tu bandeja de entrada o spam e ingrésalo a continuación.'
        );
      } else {
        setErrorMessage(res.error || 'No se pudo generar el código de recuperación.');
      }
    } catch {
      setErrorMessage('Error de conexión al solicitar código.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePerformPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanCode = resetCode.trim();

    if (!cleanCode || cleanCode.length < 6) {
      setErrorMessage('Ingresa el código numérico de 6 dígitos.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiService.resetPassword({
        email: cleanEmail,
        code: cleanCode,
        newPassword,
      });

      if (res.success) {
        setResetSuccessMessage('¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión.');
        setResetStep(1);
        setLoginEmail(cleanEmail);
        setLoginPassword('');
      } else {
        setErrorMessage(res.error || 'Error al restablecer contraseña.');
      }
    } catch {
      setErrorMessage('Error de conexión al restablecer contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setProfileSuccess(null);
    setIsLoading(true);

    try {
      const res = await updateCustomerProfile({
        phone: editPhone.trim(),
        defaultAddress: editAddress.trim(),
      });
      if (res.success) {
        setProfileSuccess('Datos actualizados correctamente.');
        setIsEditingProfile(false);
        setTimeout(() => setProfileSuccess(null), 3000);
      } else {
        setErrorMessage(res.error || 'Error al actualizar datos.');
      }
    } catch {
      setErrorMessage('Error de conexión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md p-6 bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[20px]">
                {currentUser ? 'account_circle' : modalTab === 'register' ? 'person_add' : 'lock'}
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-lg sm:text-xl text-on-surface font-bold leading-tight">
                {currentUser
                  ? 'Mi Cuenta'
                  : modalTab === 'register'
                  ? 'Crear Cuenta de Cliente'
                  : 'Iniciar Sesión'}
              </h2>
              <p className="text-body-sm text-on-surface-variant text-xs">
                Maracumango • Neiva, Huila
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

        {/* SI EL USUARIO YA ESTÁ LOGUEADO */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-container border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Sesión Activa
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : currentUser.role === 'WORKER'
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-tertiary-container text-on-tertiary-container'
                  }`}
                >
                  {currentUser.role === 'ADMIN'
                    ? 'Administrador'
                    : currentUser.role === 'WORKER'
                    ? 'Trabajador'
                    : 'Cliente Registrado'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg shadow-sm">
                  {currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'C'}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-headline-sm text-base text-on-surface truncate font-semibold">
                    {currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()}
                  </h3>
                  <p className="text-body-sm text-xs text-on-surface-variant truncate">
                    {currentUser.email}
                  </p>
                  {currentUser.phone && (
                    <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-primary">phone</span>
                      {currentUser.phone}
                    </p>
                  )}
                  {currentUser.defaultAddress && (
                    <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[13px] text-secondary">location_on</span>
                      {currentUser.defaultAddress}
                    </p>
                  )}
                  {currentUser.branchName && (
                    <p className="text-[11px] text-primary font-medium mt-0.5">
                      📍 {currentUser.branchName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium">
                {profileSuccess}
              </div>
            )}

            {/* Si es cliente: Opción de editar sus datos guardados */}
            {currentUser.role === 'CUSTOMER' && (
              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[16px]">edit_note</span>
                    Mis Datos para Pedidos
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {isEditingProfile ? 'Cancelar' : 'Modificar datos'}
                  </button>
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                        Teléfono / WhatsApp de Entrega
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Ej: 3177401873"
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                        Dirección Habitual en Neiva
                      </label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Ej: Cra. 7 # 21-45, Barrio Centro"
                        className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary font-semibold text-xs shadow-sm hover:opacity-95 transition-opacity"
                    >
                      {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-on-surface-variant">
                    Tus datos se autocompletarán automáticamente cuando hagas un pedido en el carrito.
                  </p>
                )}
              </div>
            )}

            {/* Accesos a paneles si es Administrador o Trabajador */}
            {(currentUser.role === 'ADMIN' || currentUser.role === 'WORKER') && (
              <div className="space-y-2 pt-1">
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
                  className="w-full py-3 px-4 rounded-2xl bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {currentUser.role === 'ADMIN' ? 'dashboard' : 'blender'}
                  </span>
                  <span>Ir a mi Panel de {currentUser.role === 'ADMIN' ? 'Administración' : 'Trabajador'}</span>
                </button>
              </div>
            )}

            {/* Botón Cerrar Sesión */}
            <div className="pt-2 border-t border-outline-variant/20 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  logout();
                  setIsRoleModalOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-error/30 text-error font-medium text-xs hover:bg-error/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Cerrar Sesión</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* SI EL USUARIO NO ESTÁ LOGUEADO: TABS DE LOGIN Y REGISTRO */
          <div className="space-y-4">
            {/* Selector de Pestañas o Encabezado de Recuperación */}
            {modalTab === 'forgot' ? (
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('login');
                    setErrorMessage(null);
                    setResetSuccessMessage(null);
                  }}
                  className="flex items-center gap-1 text-xs text-primary font-bold hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Volver al inicio de sesión
                </button>
                <span className="text-[11px] font-semibold text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">shield</span>
                  Protección 15 min
                </span>
              </div>
            ) : (
              <div className="flex rounded-2xl bg-surface-container p-1 border border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    modalTab === 'login'
                      ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                    modalTab === 'register'
                      ? 'bg-primary-container text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Crear Cuenta (Cliente)
                </button>
              </div>
            )}

            {/* Mensaje de Incentivo o Información de Seguridad */}
            {modalTab === 'forgot' ? (
              <div className="p-3 rounded-2xl bg-secondary-container/20 border border-secondary-container/30 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                  lock_reset
                </span>
                <p className="text-[11px] text-on-surface leading-snug">
                  <strong>Recuperación Segura:</strong> Se permite un máximo de 5 intentos. Si se supera el límite de intentos fallidos, el acceso se bloqueará durante 15 minutos por seguridad.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-secondary-container/25 border border-secondary-container/40 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                  verified
                </span>
                <p className="text-[11px] text-on-surface leading-snug">
                  <strong>¿Por qué registrarte?</strong> Para pedir en 1 solo clic sin llenar formularios cada vez y tener tus datos protegidos.
                </p>
              </div>
            )}

            {/* Mensaje de Éxito de Restablecimiento */}
            {resetSuccessMessage && (
              <div className="p-3 rounded-xl bg-primary/15 border border-primary/30 text-xs text-primary font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>{resetSuccessMessage}</span>
              </div>
            )}

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium">
                {errorMessage}
              </div>
            )}

            {/* FORMULARIO 1: INICIAR SESIÓN */}
            {modalTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <div className="flex justify-end pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalTab('forgot');
                        setErrorMessage(null);
                        setResetSuccessMessage(null);
                        setResetStep(1);
                        setResetEmail(loginEmail);
                      }}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-primary-container text-on-primary font-bold text-xs shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span>Verificando...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      <span>Ingresar a mi Cuenta</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-on-surface-variant pt-2">
                  ¿No tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab('register');
                      setErrorMessage(null);
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </form>
            )}

            {/* FORMULARIO 2: REGISTRO DE CLIENTES */}
            {modalTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Nombre Completo <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">
                      WhatsApp / Celular <span className="text-error">*</span>
                    </label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="Ej: 3177401873"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-on-surface mb-1">
                      Correo Electrónico <span className="text-error">*</span>
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Dirección Habitual en Neiva (Opcional)
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Ej: Cra. 7 / Cll 21 o Barrio Las Granjas"
                    className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-on-surface mb-1">
                    Contraseña <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Checkbox Obligatorio de Términos y Habeas Data */}
                <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer shrink-0"
                    required
                  />
                  <label htmlFor="termsCheckbox" className="text-[11px] text-on-surface-variant leading-tight cursor-pointer">
                    Acepto los{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTermsModalOpen(true);
                      }}
                      className="text-primary font-bold underline hover:text-primary-container"
                    >
                      Términos, Condiciones y la Política de Habeas Data
                    </button>
                    , y autorizo el uso de mis datos para procesar mis pedidos en Neiva.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !acceptedTerms}
                  className="w-full py-3 rounded-2xl bg-primary-container text-on-primary font-bold text-xs shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Creando cuenta...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                      <span>Registrarme y Continuar</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] text-on-surface-variant pt-1">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab('login');
                      setErrorMessage(null);
                    }}
                    className="text-primary font-bold hover:underline"
                  >
                    Inicia sesión
                  </button>
                </p>
              </form>
            )}

            {/* FORMULARIO 3: RECUPERACIÓN DE CONTRASEÑA */}
            {modalTab === 'forgot' && (
              <div className="space-y-3.5">
                {resetStep === 1 ? (
                  <form onSubmit={handleRequestResetCode} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">
                        Correo Electrónico de tu Cuenta
                      </label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="tu_correo@ejemplo.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                      <p className="text-[10px] text-on-surface-variant mt-1">
                        Ingresa el correo con el que te registraste (Cliente, Trabajador o Administrador).
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-2xl bg-primary-container text-on-primary font-bold text-xs shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <span>Generando código...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">send</span>
                          <span>Obtener Código de Recuperación</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handlePerformPasswordReset} className="space-y-3">
                    {generatedCodeHint && (
                      <div className="p-3 rounded-2xl bg-secondary-container/20 border border-secondary-container/30 text-xs text-on-surface flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                          mark_email_read
                        </span>
                        <div className="leading-snug">
                          <strong>Revisa tu correo:</strong> {generatedCodeHint}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">
                        Código de 6 Dígitos <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej: 123456"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-center tracking-widest text-base font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">
                        Nueva Contraseña (Mínimo 6 caracteres)
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nueva contraseña segura"
                        className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-on-surface mb-1">
                        Confirmar Nueva Contraseña
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-2xl bg-primary text-on-primary font-bold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <span>Guardando nueva contraseña...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                          <span>Restablecer mi Contraseña</span>
                        </>
                      )}
                    </button>

                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setResetStep(1)}
                        className="text-on-surface-variant hover:text-on-surface underline"
                      >
                        Reenviar código
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setModalTab('login');
                          setErrorMessage(null);
                        }}
                        className="text-primary font-bold hover:underline"
                      >
                        Ir a Iniciar Sesión
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Enlace sutil para personal del equipo */}
            <div className="pt-3 border-t border-outline-variant/15 text-center">
              <p className="text-[11px] text-on-surface-variant">
                💼 ¿Eres parte del equipo? Inicia sesión arriba con tus credenciales institucionales de Trabajador o Administrador.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
