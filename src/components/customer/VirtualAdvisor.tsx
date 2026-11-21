import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

interface Message {
  id: string;
  sender: 'advisor' | 'user';
  text: string;
  actionUrl?: string;
  actionLabel?: string;
}

export const VirtualAdvisor: React.FC = () => {
  const { cart, sedes, products, userRole, config } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'advisor',
      text: '¡Hola! 👋 Soy tu Asesor Virtual de Maracumango. Estoy aquí para resolver tus dudas de inmediato. ¿En qué te puedo colaborar hoy?',
    },
  ]);
  const [showOptions, setShowOptions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSedes = sedes.filter(
    (s) => !s.nombre.toLowerCase().includes('covaleda') && s.id !== 'sede-1795151700722'
  );

  // Obtiene en tiempo real los productos que el Administrador marcó como "Popular ★"
  const popularProducts = products.filter((p) => p.active !== false && p.popular);
  const recommendedList =
    popularProducts.length > 0
      ? popularProducts
      : products.filter((p) => p.active !== false).slice(0, 3);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (userRole !== 'customer') {
    return null;
  }

  const faqList = [
    {
      id: 'direccion',
      question: '¿Cómo modifico mis datos como la dirección?',
      answer:
        '¡Es muy sencillo!\n\n1️⃣ Si ya iniciaste sesión, haz clic en tu nombre en la barra superior y selecciona "Mi Perfil". Allí puedes actualizar tu dirección de entrega en Neiva y tu número de WhatsApp.\n\n2️⃣ También puedes modificar tu dirección y celular directamente en el carrito de compras antes de confirmar tu pedido.',
    },
    {
      id: 'pagos',
      question: '¿Cuáles son los medios de pago?',
      answer:
        'Aceptamos exclusivamente pagos por transferencia electrónica:\n\n📱 Nequi\n🏦 Bancolombia\n\n⚠️ Aviso importante: Al enviar el pedido por WhatsApp, recuerda adjuntar en el mismo chat el comprobante de pago para que la administradora lo apruebe y pase de inmediato a preparación.',
    },
    {
      id: 'sedes',
      question: '¿Dónde están ubicados y cuáles son los horarios?',
      answer:
        'Nuestras sedes en Neiva son:\n\n' +
        activeSedes
          .map((s) => {
            const status = s.activa !== false ? '🟢 Abierto ahora' : '🔴 Cerrado hoy';
            return `📍 ${s.nombre} (${status})\n• Dirección: ${s.direccion}\n• Horario: ${s.horario || 'Jornada continua'}\n• WhatsApp: +57 ${s.whatsapp}`;
          })
          .join('\n\n'),
    },
    {
      id: 'domicilio',
      question: '¿Cómo funciona el domicilio en Neiva?',
      answer:
        '🛵 ¡Te llevamos tu producto bien frío y recién preparado!\n\nTu pedido se despacha desde la sede más cercana a tu ubicación. El costo del domicilio se acuerda directamente con la administradora a través de WhatsApp según tu barrio o comuna.',
    },
    {
      id: 'recomendados',
      question: '¿Cuáles son los productos más pedidos?',
      answer:
        '🥭 Los productos más pedidos y destacados por nuestra administración en Neiva son:\n\n' +
        (recommendedList.length > 0
          ? recommendedList
              .map((p) => `• ${p.name} (${p.price.toLocaleString('es-CO')}) — ${p.category}`)
              .join('\n')
          : '• Granizado Tropical Maracumango\n• Michelada Artesanal\n• Helado Artesanal') +
        '\n\n¡Puedes seleccionarlos y agregarlos directamente desde el menú principal!',
    },
    {
      id: 'humano',
      question: 'Quiero hablar con un asesor humano por WhatsApp',
      answer:
        '¡Con mucho gusto! Puedes comunicarte directamente con nuestra administradora en Neiva haciendo clic en el siguiente botón:',
      actionUrl: `https://wa.me/57${config.whatsappNumber || '3177401873'}?text=${encodeURIComponent(
        '¡Hola Maracumango! Vengo desde la página web y deseo consultar con un asesor.'
      )}`,
      actionLabel: 'Abrir WhatsApp de la Administradora',
    },
  ];

  const handleSelectFaq = (faq: (typeof faqList)[0]) => {
    setShowOptions(false);
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: faq.question,
    };
    const advisorMsg: Message = {
      id: `a-${Date.now()}`,
      sender: 'advisor',
      text: faq.answer,
      actionUrl: faq.actionUrl,
      actionLabel: faq.actionLabel,
    };
    setMessages((prev) => [...prev, userMsg, advisorMsg]);
  };

  const handleRestart = () => {
    setShowOptions(true);
  };

  return (
    <>
      {/* Botón Flotante Disparador del Asesor (Inferior Izquierda) */}
      <aside
        aria-label="Asistente virtual de atención al cliente"
        className={`fixed z-30 transition-all duration-300 ${
          totalCartItems > 0
            ? 'bottom-24 left-4 sm:bottom-6 sm:left-6'
            : 'bottom-5 left-4 sm:bottom-6 sm:left-6'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.18)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)] border transition-all duration-200 active:scale-95 group ${
            isOpen
              ? 'bg-surface-container-highest text-on-surface border-outline-variant/30'
              : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low border-outline-variant/20'
          }`}
          title="Abrir Asesor Virtual de Maracumango"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary-container text-on-primary">
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface animate-pulse" />
          </div>
          <div className="flex flex-col text-left leading-tight hidden xs:flex">
            <span className="text-xs font-bold text-on-surface">Asesor Virtual</span>
            <span className="text-[10px] text-primary font-semibold">¿Dudas? Pregúntame</span>
          </div>
        </button>
      </aside>

      {/* Ventana de Chat del Asesor */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Chat con el Asesor Virtual"
          className="fixed bottom-20 left-4 sm:bottom-22 sm:left-6 z-40 w-[calc(100vw-32px)] max-w-sm sm:max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-3xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.30)] flex flex-col overflow-hidden animate-fadeIn"
          style={{ maxHeight: 'calc(100vh - 120px)', height: '520px' }}
        >
          {/* Header del Chat */}
          <div className="p-4 bg-gradient-to-r from-primary-container via-primary-container to-primary text-on-primary flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30 text-white">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Asesor Virtual Maracumango</h3>
                <p className="text-[11px] text-white/90 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  En línea • Respuestas al instante
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Cerrar chat"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-container-low/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-primary-container text-on-primary font-medium rounded-tr-sm shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface border border-outline-variant/20 rounded-tl-sm shadow-sm whitespace-pre-line'
                  }`}
                >
                  {m.text}
                  {m.actionUrl && (
                    <a
                      href={m.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">chat</span>
                      <span>{m.actionLabel || 'Contactar'}</span>
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Opciones Interactivas de Preguntas Frecuentes */}
            {showOptions ? (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider pl-1">
                  Preguntas frecuentes:
                </p>
                <div className="flex flex-col gap-1.5">
                  {faqList.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => handleSelectFaq(faq)}
                      className="w-full text-left p-2.5 rounded-xl bg-surface-container-lowest hover:bg-primary-container/10 border border-outline-variant/25 text-on-surface hover:text-primary text-xs font-semibold transition-all flex items-center justify-between gap-2 shadow-2xs group"
                    >
                      <span>{faq.question}</span>
                      <span className="material-symbols-outlined text-[16px] text-outline-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold text-xs flex items-center gap-1.5 border border-outline-variant/20 shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">help_outline</span>
                  <span>Hacer otra consulta</span>
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer del Chat */}
          <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px] text-primary">eco</span>
              Maracumango Neiva
            </span>
            <span className="text-tertiary font-bold">Atención 100% gratuita</span>
          </div>
        </div>
      )}
    </>
  );
};
