import React from 'react';
import { useApp } from '../../context/AppContext';

export const TermsModal: React.FC = () => {
  const { isTermsModalOpen, setIsTermsModalOpen } = useApp();

  if (!isTermsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">policy</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
                Términos, Condiciones y Habeas Data
              </h2>
              <p className="text-body-sm text-xs text-on-surface-variant">
                Política de Tratamiento y Protección de Datos Personales • Maracumango Neiva
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTermsModalOpen(false)}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
            title="Cerrar"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-on-surface-variant leading-relaxed">
          {/* Introducción */}
          <div className="p-4 rounded-2xl bg-primary-container/10 border border-primary/20 text-on-surface">
            <p className="font-medium text-xs sm:text-sm">
              En <strong>Maracumango</strong> (Neiva, Huila) nos comprometemos con la transparencia, la seguridad de tu información y el cumplimiento estricto de la legislación colombiana (<strong>Ley 1581 de 2012</strong> y Decreto 1377 de 2013).
            </p>
          </div>

          {/* Sección 1: Qué datos se usan */}
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
              1. ¿Qué datos personales recopilamos?
            </h3>
            <p>
              Para prestar un servicio ágil y personalizado, solicitamos exclusivamente:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 pl-2 text-xs sm:text-sm">
              <li><strong>Nombre completo:</strong> Para identificar tu orden y dirigirte un trato respetuoso.</li>
              <li><strong>Número de celular o WhatsApp:</strong> Para confirmar la orden, coordinar la entrega y enviarte el recibo digital.</li>
              <li><strong>Correo electrónico:</strong> Como identificador único para el inicio de sesión y recuperación de cuenta.</li>
              <li><strong>Dirección de entrega (en Neiva):</strong> Para llevar tus productos al lugar indicado en pedidos a domicilio.</li>
              <li><strong>Historial de compras:</strong> Para facilitar la repetición de tus pedidos favoritos y gestionar promociones.</li>
            </ul>
          </div>

          {/* Sección 2: Para qué se usan */}
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">checklist</span>
              2. Finalidad del Tratamiento de Datos
            </h3>
            <p>
              Tus datos son utilizados única y exclusivamente para los siguientes fines operativos y comerciales legítimos:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 pl-2 text-xs sm:text-sm">
              <li>Procesar, preparar y entregar los pedidos realizados en nuestras sedes de Neiva.</li>
              <li>Comunicación directa vía WhatsApp entre la administración y tú para coordinar el domicilio o retiro.</li>
              <li>Prevenir fraudes, pedidos suplantados o envíos automáticos no deseados.</li>
              <li>Habilitar el autocompletado en tus próximas compras para que no tengas que digitar tus datos cada vez.</li>
            </ul>
            <p className="mt-2 text-xs font-semibold text-primary">
              🔒 <strong>Garantía de privacidad:</strong> Maracumango nunca venderá, compartirá ni transferirá tus datos personales a terceros con fines publicitarios o ajenos a tu pedido.
            </p>
          </div>

          {/* Sección 3: Cómo y dónde se guardan */}
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">shield_lock</span>
              3. ¿Cómo y dónde se almacenan tus datos?
            </h3>
            <p>
              Implementamos rigurosos estándares técnicos y de ciberseguridad:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 pl-2 text-xs sm:text-sm">
              <li><strong>Base de datos en la nube:</strong> Tu información se aloja en servidores de base de datos relacional Neon PostgreSQL con conexiones cifradas obligatorias bajo protocolo <code>SSL (TLS)</code>.</li>
              <li><strong>Contraseñas seguras:</strong> Tu clave nunca se almacena en texto plano; se cifra mediante el algoritmo criptográfico unidireccional <code>bcrypt</code> con salt de alta seguridad.</li>
              <li><strong>Sesiones protegidas:</strong> El acceso autenticado se gestiona mediante tokens seguros JSON Web Token (JWT) con expiración controlada.</li>
            </ul>
          </div>

          {/* Sección 4: Derechos del titular (Habeas Data) */}
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              4. Tus Derechos como Titular (Habeas Data)
            </h3>
            <p>
              De conformidad con la Ley 1581 de 2012, tienes pleno derecho a:
            </p>
            <ul className="list-disc list-inside mt-1.5 space-y-1 pl-2 text-xs sm:text-sm">
              <li><strong>Conocer y acceder:</strong> Consultar tus datos personales registrados en el sistema en cualquier momento.</li>
              <li><strong>Actualizar y rectificar:</strong> Modificar tu número de contacto, nombre o dirección desde tu perfil de usuario.</li>
              <li><strong>Revocar y suprimir:</strong> Solicitar la eliminación definitiva de tu cuenta y datos de nuestros registros escribiendo a nuestro WhatsApp oficial de atención.</li>
            </ul>
          </div>

          {/* Sección 5: Condiciones del Pedido */}
          <div>
            <h3 className="font-bold text-on-surface text-base flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-[18px]">moped</span>
              5. Condiciones de los Pedidos y Domicilios
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs sm:text-sm">
              <li>Los pedidos se preparan artesanalmente en la sede seleccionada en Neiva tras la confirmación de la administradora.</li>
              <li>En la modalidad domicilio, el valor del flete de transporte se acuerda directamente por WhatsApp según la distancia de tu sector en Neiva.</li>
              <li>Los pagos por Nequi o Daviplata se validan con el comprobante de transferencia antes o al momento de la entrega.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low/50 flex justify-end">
          <button
            onClick={() => setIsTermsModalOpen(false)}
            className="px-6 py-2.5 rounded-2xl bg-primary-container text-on-primary font-semibold text-sm hover:bg-primary transition-all shadow-sm"
          >
            Entendido y Conforme
          </button>
        </div>
      </div>
    </div>
  );
};
