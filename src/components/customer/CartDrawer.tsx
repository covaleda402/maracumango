import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { DeliveryMethod, PaymentMethod } from '../../types';
import { getSedeById } from '../../data/sedes';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
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

  if (!isCartOpen) return null;

  const currentSede = sedes.find((s) => s.id === selectedSedeId) || getSedeById(selectedSedeId);
  const total = cartSubtotal;

  const handleDeliveryMethodChange = (method: DeliveryMethod) => {
    setDeliveryMethod(method);
    if (method === 'recoger') {
      setPaymentMethod('nequi');
    }
  };

  // Input Sanitizers according to requirements
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Nombre: NO permitir números
    const cleanValue = e.target.value.replace(/[0-9]/g, '');
    setCustomerName(cleanValue);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Teléfono: NO permitir letras
    const cleanValue = e.target.value.replace(/[a-zA-Z]/g, '');
    setCustomerPhone(cleanValue);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Indicaciones: NO permitir números
    const cleanValue = e.target.value.replace(/[0-9]/g, '');
    setNotes(cleanValue);
  };

  const handleWhatsAppCheckout = async () => {
    // 1. Validations
    if (cart.length === 0) {
      setErrorMessage('El carrito está vacío. Agrega productos para continuar.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMessage('Por favor ingresa tu nombre.');
      return;
    }
    if (/\d/.test(customerName)) {
      setErrorMessage('El nombre no puede contener números.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Por favor ingresa tu número de teléfono.');
      return;
    }
    if (/[a-zA-Z]/.test(customerPhone)) {
      setErrorMessage('El teléfono no puede contener letras.');
      return;
    }
    if (notes && /\d/.test(notes)) {
      setErrorMessage('Las indicaciones del pedido no pueden contener números.');
      return;
    }
    if (deliveryMethod === 'domicilio' && !deliveryAddress.trim()) {
      setErrorMessage('Por favor ingresa la dirección para la entrega del domicilio.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // 2. Create order in Database (status: PENDING_ADMIN)
      const createdOrder = await createOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        sedeId: selectedSedeId,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'domicilio' ? deliveryAddress.trim() : undefined,
        deliveryFee: 0, // Delivery fee agreed directly with admin
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

*Cliente:* ${createdOrder.customerName}
*Teléfono:* ${createdOrder.customerPhone}

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
*Método de Pago Preferido:* ${createdOrder.paymentMethod === 'nequi' ? 'Nequi' : 'Efectivo'}${
        createdOrder.notes ? `\n*Indicaciones:* ${createdOrder.notes}` : ''
      }

¡Hola Administradora! Acabo de enviar mi pedido a través del sistema web. Quedo atento a tu confirmación${
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
            <h2 className="font-headline-md text-headline-md text-on-surface">Mi Pedido</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container/15 text-primary font-label-sm text-label-sm">
              {cart.length} ítems
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
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
                  Explora nuestro menú de granizados, micheladas y helados y agrega tus favoritos.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Product List */}
              <div className="space-y-space-sm">
                <h3 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider">
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
                      <h4 className="font-label-lg text-label-lg text-on-surface truncate">
                        {item.product.name}
                      </h4>
                      <p className="font-body-sm text-body-sm text-primary font-semibold">
                        ${item.product.price.toLocaleString('es-CO')} c/u
                      </p>
                    </div>

                    {/* Quantity capsules */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-surface-container-low rounded-lg p-1">
                        <button
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span className="w-6 text-center font-label-md text-label-md">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 rounded text-error hover:bg-error-container/20 transition-colors"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Form: Customer Details */}
              <div className="p-space-md rounded-3xl bg-surface-container-lowest border border-outline-variant/20 space-y-space-md">
                <h3 className="font-label-lg text-label-lg text-on-surface uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                  Datos del Cliente
                </h3>

                <div className="space-y-3">
                  {/* Nombre: NO permite números */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">
                      Nombre Completo * <span className="text-[11px] text-on-surface-variant font-normal">(solo letras)</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={handleNameChange}
                      placeholder="Ej. Juan Pérez"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Teléfono: NO permite letras */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">
                      Teléfono / WhatsApp * <span className="text-[11px] text-on-surface-variant font-normal">(solo números)</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      placeholder="Ej. 3176199622"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Sede Selection */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">store</span>
                        <span>Selecciona la Sede de Preparación *</span>
                      </span>
                      <span className="text-xs text-on-surface-variant">Neiva</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {sedes.map((sede) => {
                        const isSelected = selectedSedeId === sede.id;
                        return (
                          <button
                            key={sede.id}
                            type="button"
                            onClick={() => setSelectedSedeId(sede.id)}
                            className={`p-3 rounded-2xl text-left transition-all border flex items-start justify-between ${
                              isSelected
                                ? 'bg-primary-container/10 border-primary shadow-sm'
                                : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-primary animate-pulse' : 'bg-outline-variant'}`}></span>
                                <p className="font-label-lg text-label-md text-on-surface font-semibold">{sede.nombre}</p>
                              </div>
                              <p className="text-xs text-on-surface-variant flex items-center gap-1 pl-4">
                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                {sede.direccion}
                              </p>
                              <p className="text-[11px] text-tertiary flex items-center gap-1 pl-4">
                                <span className="material-symbols-outlined text-[13px]">chat</span>
                                WhatsApp: +57 {sede.whatsapp}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Method */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                      Método de Entrega *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeliveryMethodChange('domicilio')}
                        className={`p-3 rounded-xl flex items-center justify-center gap-2 font-label-md text-label-md transition-all border ${
                          deliveryMethod === 'domicilio'
                            ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">moped</span>
                        <span>Domicilio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeliveryMethodChange('recoger')}
                        className={`p-3 rounded-xl flex items-center justify-center gap-2 font-label-md text-label-md transition-all border ${
                          deliveryMethod === 'recoger'
                            ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">storefront</span>
                        <span>Recoger en Negocio</span>
                      </button>
                    </div>
                  </div>

                  {/* Address if Domicilio */}
                  {deliveryMethod === 'domicilio' && (
                    <div>
                      <label className="block font-label-md text-label-md text-on-surface mb-1">
                        Dirección de Entrega (Neiva) *
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Ej. Cra 7 # 21-15 Barrio Centro"
                        className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-[11px] text-tertiary mt-1">
                        El costo del domicilio se acuerda directamente con la administradora.
                      </p>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-label-md text-label-md text-on-surface">
                        Método de Pago *
                      </label>
                      {deliveryMethod === 'recoger' && (
                        <span className="text-[11px] text-tertiary font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">info</span>
                          Solo Nequi para recoger
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('nequi')}
                        className={`p-3 rounded-xl flex items-center justify-center gap-2 font-label-md text-label-md transition-all border ${
                          paymentMethod === 'nequi'
                            ? 'bg-tertiary-container text-on-tertiary border-tertiary-container shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                        <span>Nequi</span>
                      </button>

                      <button
                        type="button"
                        disabled={deliveryMethod === 'recoger'}
                        onClick={() => deliveryMethod !== 'recoger' && setPaymentMethod('efectivo')}
                        className={`p-3 rounded-xl flex items-center justify-center gap-2 font-label-md text-label-md transition-all border ${
                          deliveryMethod === 'recoger'
                            ? 'opacity-40 cursor-not-allowed bg-surface-container-low border-outline-variant/10 text-on-surface-variant/40'
                            : paymentMethod === 'efectivo'
                            ? 'bg-tertiary-container text-on-tertiary border-tertiary-container shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                        }`}
                        title={deliveryMethod === 'recoger' ? 'Solo disponible para domicilios' : undefined}
                      >
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        <span>Efectivo</span>
                      </button>
                    </div>
                  </div>

                  {/* Indicaciones / Notas: NO permite números */}
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1">
                      Indicaciones / Observaciones (Opcional) <span className="text-[11px] text-on-surface-variant font-normal">(sin números)</span>
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Ej. Poco tajín, sin sal, etc."
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Breakdown & Action Button */}
        {cart.length > 0 && (
          <div className="p-space-md bg-surface-container-lowest border-t border-outline-variant/20 space-y-space-md">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2 text-body-sm">
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
              <div className="flex justify-between text-headline-sm font-bold text-on-surface pt-2 border-t border-outline-variant/20">
                <span>Total productos:</span>
                <span className="text-primary">${total.toLocaleString('es-CO')}</span>
              </div>
            </div>

            {/* AVISO DE FLUJO: El pedido va primero a la administradora */}
            <div className="p-2.5 rounded-xl bg-primary-container/10 border border-primary/20 text-[11px] text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              <span>El pedido será validado por la administración antes de pasar a preparación.</span>
            </div>

            {/* UNICO BOTON DE ENVIO */}
            <button
              disabled={isSubmitting}
              onClick={handleWhatsAppCheckout}
              className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-label-lg text-label-lg shadow-lg hover:bg-[#20bd5a] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[24px]">chat</span>
              <span>{isSubmitting ? 'Registrando pedido...' : 'Enviar Pedido al Administrador'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
