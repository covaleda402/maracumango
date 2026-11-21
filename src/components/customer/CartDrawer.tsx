import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { DeliveryMethod, PaymentMethod } from '../../types';
import { getSedeById } from '../../data/sedes';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    setIsRoleModalOpen,
    setIsTermsModalOpen,
    currentUser,
    cart,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    config,
    sedes,
    selectedSedeId,
    setSelectedSedeId,
    createOrder,
  } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('domicilio');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nequi');
  const [notes, setNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync registered user's saved data into checkout fields
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim());
      if (currentUser.phone) {
        setCustomerPhone(currentUser.phone);
      }
      if (currentUser.defaultAddress) {
        setDeliveryAddress(currentUser.defaultAddress);
      }
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryAddress('');
    }
  }, [currentUser]);

  // Auto-switch to open sede if currently selected sede is closed
  useEffect(() => {
    const current = sedes.find((s) => s.id === selectedSedeId);
    if (current && current.activa === false) {
      const firstOpen = sedes.find((s) => s.activa !== false && !s.nombre.toLowerCase().includes('covaleda'));
      if (firstOpen) {
        setSelectedSedeId(firstOpen.id);
      }
    }
  }, [sedes, selectedSedeId, setSelectedSedeId]);

  if (!isCartOpen) return null;

  const currentSede = sedes.find((s) => s.id === selectedSedeId) || getSedeById(selectedSedeId);
  const total = cartSubtotal;

  const handleDeliveryMethodChange = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === 'recoger') {
      setPaymentMethod('nequi');
    }
  };

  const handleWhatsAppCheckout = async () => {
    if (!currentUser) {
      setIsRoleModalOpen(true);
      return;
    }

    // 1. Validations
    if (cart.length === 0) {
      setErrorMessage('El carrito está vacío. Agrega productos para continuar.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Por favor verifica tu nombre.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Por favor verifica tu número de teléfono o WhatsApp.');
      return;
    }
    if (deliveryMethod === 'domicilio' && !deliveryAddress.trim()) {
      setErrorMessage('Por favor ingresa la dirección para la entrega del domicilio en Neiva.');
      return;
    }
    if (currentSede.activa === false) {
      setErrorMessage('La sede seleccionada se encuentra cerrada en este momento. Por favor elige una sede abierta.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // 2. Create order in Database (status: PENDING_ADMIN, authenticated as currentUser)
      const createdOrder = await createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        sedeId: selectedSedeId,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'domicilio' ? deliveryAddress.trim() : undefined,
        deliveryFee: 0,
        paymentMethod,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      // 3. Build WhatsApp notification message for the Administrator
      const itemsListText = createdOrder.items
        .map(
          (item) =>
            `• ${item.quantity}x ${item.productName} - $${(
              item.unitPrice * item.quantity
            ).toLocaleString('es-CO')}`
        )
        .join('\n');

      const message = `🥭 *NUEVO PEDIDO MARACUMANGO — PENDIENTE DE REVISIÓN* 🥭
*Pedido:* ${createdOrder.orderNumber}
*Sede:* ${currentSede.nombre}
*Estado:* Pendiente de aprobación administrativa

*Cliente Registrado:* ${createdOrder.customerName}
*WhatsApp:* ${createdOrder.customerPhone}
${currentUser.email ? `*Correo:* ${currentUser.email}\n` : ''}
*Productos Solicitados:*
${itemsListText}

*Subtotal Productos:* $${createdOrder.subtotal.toLocaleString('es-CO')}
${
  deliveryMethod === 'domicilio'
    ? `*Costo Domicilio:* (A acordar con la administradora)`
    : `*Entrega:* Recoger en negocio (Sin costo)`
}
*Método de Entrega:* ${
        createdOrder.deliveryMethod === 'domicilio'
          ? `Domicilio (${createdOrder.deliveryAddress})`
          : `Recoger en tienda (${currentSede.nombre})`
      }
*Método de Pago:* Transferencia (${createdOrder.paymentMethod === 'bancolombia' ? 'Bancolombia' : 'Nequi'})
📸 *Comprobante Obligatorio:* Se debe enviar el mensaje del pedido y también en el mismo WhatsApp el comprobante de pago.${
        createdOrder.notes ? `\n*Indicaciones:* ${createdOrder.notes}` : ''
      }

¡Hola Administradora! Acabo de enviar mi pedido desde mi cuenta en el sistema web. Quedo atento a tu confirmación${
        deliveryMethod === 'domicilio' ? ' y costo acordado de domicilio' : ''
      }.`;

      // 4. Resolve WhatsApp number for the target sede
      const targetWhatsapp =
        selectedSedeId === 'sede-2'
          ? currentSede.whatsapp || config.sede2Whatsapp || '3219759794'
          : currentSede.whatsapp || config.sede1Whatsapp || '3177401873';

      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/57${targetWhatsapp}?text=${encodedMessage}`;

      setIsCartOpen(false);
      window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar el pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-on-surface/50 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-lg bg-surface flex flex-col h-full shadow-2xl border-l border-outline-variant/30">
        {/* Header */}
        <div className="p-space-md bg-surface-container-lowest border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[24px]">shopping_bag</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Mi Pedido</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container/15 text-primary font-label-sm text-label-sm font-semibold">
              {cart.length} {cart.length === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Cerrar carrito"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-space-md space-y-space-lg">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-space-md">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px]">remove_shopping_cart</span>
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm text-on-surface">Tu carrito está vacío</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mt-1">
                  Explora nuestro menú de granizados, micheladas y helados artesanales en Neiva.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Product List */}
              <div className="space-y-space-sm">
                <h3 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider font-bold">
                  Productos Seleccionados
                </h3>
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-space-sm rounded-2xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between gap-space-xs"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 bg-surface-container"
                    />
                    <div className="flex-1 min-w-0 px-2">
                      <h4 className="font-label-lg text-label-lg text-on-surface truncate font-semibold">
                        {item.product.name}
                      </h4>
                      <p className="font-body-sm text-body-sm text-primary font-bold">
                        ${item.product.price.toLocaleString('es-CO')} c/u
                      </p>
                    </div>

                    {/* Quantity capsules */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                          title="Restar uno"
                        >
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="w-6 text-center font-label-md text-label-md font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                          title="Añadir uno"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 rounded text-error hover:bg-error-container/20 transition-colors"
                        title="Eliminar producto"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* SI EL USUARIO NO HA INICIADO SESIÓN: BLOQUEO INFORMATIVO CON LLAMADO A LA ACCIÓN */}
              {!currentUser ? (
                <div className="p-space-md rounded-3xl bg-secondary-container/20 border-2 border-dashed border-secondary/40 space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[22px]">lock_person</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">
                        Inicia sesión para ordenar
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        Para procesar tu pedido, tus datos deben estar registrados y verificados con tu aceptación de términos de Habeas Data. ¡Así tus pedidos futuros se enviarán en 1 solo clic!
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRoleModalOpen(true)}
                    className="w-full py-3 rounded-2xl bg-primary-container text-on-primary font-bold text-xs shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Iniciar Sesión o Crear Cuenta</span>
                  </button>
                </div>
              ) : (
                /* SI EL USUARIO YA ESTÁ LOGUEADO: DATOS REGISTRADOS AUTOCOMPLETADOS */
                <div className="p-space-md rounded-3xl bg-surface-container-lowest border border-outline-variant/20 space-y-space-md">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <h3 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">how_to_reg</span>
                      Datos del Cliente Registrado
                    </h3>
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      Cuenta Verificada
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Nombre registrado */}
                    <div>
                      <label className="block font-label-md text-xs text-on-surface mb-1">
                        Nombre Completo
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                      />
                    </div>

                    {/* Teléfono / WhatsApp registrado */}
                    <div>
                      <label className="block font-label-md text-xs text-on-surface mb-1">
                        Teléfono / WhatsApp de Entrega
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/[a-zA-Z]/g, ''))}
                        placeholder="Ej. 3177401873"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                      />
                    </div>

                    {/* Sede Selection */}
                    <div>
                      <label className="block font-label-md text-xs text-on-surface mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-bold">
                          <span className="material-symbols-outlined text-primary text-[16px]">store</span>
                          <span>Selecciona la Sede de Preparación *</span>
                        </span>
                        <span className="text-[11px] text-on-surface-variant">Neiva</span>
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {sedes
                          .filter(
                            (s) =>
                              !s.nombre.toLowerCase().includes('covaleda') &&
                              s.id !== 'sede-1795151700722'
                          )
                          .map((sede) => {
                          const isSelected = selectedSedeId === sede.id;
                          const isOpen = sede.activa !== false;
                          return (
                            <button
                              key={sede.id}
                              type="button"
                              disabled={!isOpen}
                              onClick={() => isOpen && setSelectedSedeId(sede.id)}
                              className={`p-3 rounded-2xl text-left transition-all border flex items-start justify-between w-full ${
                                !isOpen
                                  ? 'opacity-55 cursor-not-allowed bg-surface-container-lowest/60 border-error/20'
                                  : isSelected
                                  ? 'bg-primary-container/10 border-primary shadow-sm cursor-pointer'
                                  : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container cursor-pointer'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${!isOpen ? 'bg-error' : isSelected ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`}></span>
                                  <p className="font-label-lg text-xs text-on-surface font-semibold">{sede.nombre}</p>
                                  {!isOpen && (
                                    <span className="px-2 py-0.5 rounded-full bg-error/15 text-error text-[10px] font-bold">
                                      Cerrado hoy
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-on-surface-variant flex items-center gap-1 pl-3.5">
                                  <span className="material-symbols-outlined text-[13px]">location_on</span>
                                  {sede.direccion}
                                </p>
                                <p className="text-[10px] text-primary flex items-center gap-1 pl-3.5 font-medium">
                                  <span className="material-symbols-outlined text-[12px]">chat</span>
                                  WhatsApp: +57 {sede.whatsapp}
                                </p>
                              </div>
                              {isSelected && isOpen && (
                                <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div>
                      <label className="block font-label-md text-xs text-on-surface mb-1.5 font-bold">
                        Método de Entrega *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeliveryMethodChange('domicilio')}
                          className={`p-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all border ${
                            deliveryMethod === 'domicilio'
                              ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">moped</span>
                          <span>Domicilio</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeliveryMethodChange('recoger')}
                          className={`p-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all border ${
                            deliveryMethod === 'recoger'
                              ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">storefront</span>
                          <span>Recoger en Negocio</span>
                        </button>
                      </div>
                    </div>

                    {/* Dirección si es Domicilio */}
                    {deliveryMethod === 'domicilio' && (
                      <div>
                        <label className="block font-label-md text-xs text-on-surface mb-1">
                          Dirección de Entrega en Neiva *
                        </label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Ej. Cra 7 # 21-15, Barrio Centro, Casa o Apto"
                          className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
                        />
                        <p className="text-[11px] text-tertiary mt-1">
                          El valor del domicilio se acuerda directamente con la administradora por WhatsApp.
                        </p>
                      </div>
                    )}

                    {/* Método de Pago (Solo Transferencias: Nequi / Bancolombia) */}
                    <div className="space-y-2">
                      <label className="block font-label-md text-xs text-on-surface font-bold">
                        Método de Pago (Transferencia) *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('nequi')}
                          className={`p-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all border ${
                            paymentMethod === 'nequi'
                              ? 'bg-secondary-container text-on-secondary-container border-secondary-container shadow-sm font-bold'
                              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                          <span>Nequi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('bancolombia')}
                          className={`p-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition-all border ${
                            paymentMethod === 'bancolombia'
                              ? 'bg-secondary-container text-on-secondary-container border-secondary-container shadow-sm font-bold'
                              : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">account_balance</span>
                          <span>Bancolombia</span>
                        </button>
                      </div>

                      {/* Aviso Obligatorio de Comprobante de Pago */}
                      <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-on-surface flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px] shrink-0 mt-0.5">
                          receipt_long
                        </span>
                        <div className="leading-snug">
                          <strong className="text-amber-800 dark:text-amber-300 font-bold block text-xs">
                            Aviso de Pago:
                          </strong>
                          <p className="mt-0.5 text-[11px] text-on-surface-variant font-medium">
                            Se debe enviar el mensaje del pedido y tambien en el mismo whatsApp el comprobante de pago.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Indicaciones / Observaciones (ahora permite números: Apto 302, Casa 4, etc.) */}
                    <div>
                      <label className="block font-label-md text-xs text-on-surface mb-1">
                        Indicaciones del Pedido (Opcional)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej. Casa 4, Apto 302, llevar cambio de $20.000, poco tajín"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    {/* Recordatorio de Términos Aceptados */}
                    <div className="pt-2 text-[11px] text-on-surface-variant flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[14px]">shield</span>
                      <span>
                        Datos amparados por los{' '}
                        <button
                          type="button"
                          onClick={() => setIsTermsModalOpen(true)}
                          className="text-primary font-bold underline hover:text-primary-container"
                        >
                          Términos y Habeas Data
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Breakdown & Action Button */}
        {cart.length > 0 && (
          <div className="p-space-md bg-surface-container-lowest border-t border-outline-variant/20 space-y-space-md">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-on-surface-variant">
                <span>Subtotal productos:</span>
                <span className="font-semibold text-on-surface">
                  ${cartSubtotal.toLocaleString('es-CO')}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Costo Domicilio:</span>
                <span className="font-semibold text-primary">
                  {deliveryMethod === 'domicilio'
                    ? 'A acordar con administradora'
                    : 'Gratis (Recoger en tienda)'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-on-surface pt-2 border-t border-outline-variant/20">
                <span>Total productos:</span>
                <span className="text-primary">${total.toLocaleString('es-CO')}</span>
              </div>
            </div>

            {/* BOTÓN CONDICIONAL SEGÚN ESTADO DE AUTENTICACIÓN */}
            {!currentUser ? (
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-primary-container text-on-primary font-bold text-xs shadow-md hover:bg-primary transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Inicia Sesión para Confirmar tu Pedido</span>
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={handleWhatsAppCheckout}
                className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-bold text-xs shadow-lg hover:bg-[#20bd5a] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[22px]">chat</span>
                <span>{isSubmitting ? 'Registrando pedido...' : 'Enviar Pedido con mis Datos'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
