import React from 'react';
import { useApp } from '../../context/AppContext';
import { SEDES } from '../../data/sedes';

export const SedesCard: React.FC = () => {
  const { sedes } = useApp();
  const branchesList = (sedes && sedes.length > 0 ? sedes : SEDES).filter(
    (s) => !s.nombre.toLowerCase().includes('covaleda') && s.id !== 'sede-1795151700722'
  );

  return (
    <div className="w-full bg-surface-container-lowest rounded-3xl p-space-lg shadow-[0_4px_24px_-2px_rgba(106,191,0,0.10)] border border-outline-variant/20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md mb-space-lg pb-space-md border-b border-outline-variant/20">
        <div>
          <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-full bg-tertiary-container/15 text-tertiary font-label-sm uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            Sedes Operativas
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">
            Nuestras Sedes en Neiva
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xl mt-1">
            Visítanos en nuestras ubicaciones o haz tu pedido anticipado para pasar a recoger sin hacer filas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-4 py-2 rounded-full bg-surface-container text-on-surface font-label-md text-label-md">
            Neiva, Huila
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {branchesList.map((sede, idx) => {
          const cleanPhone = (sede.whatsapp || sede.phone || '3177401873').replace(/\D/g, '');
          const isPrimary = idx === 0;
          const isOpen = sede.activa !== false;

          return (
            <div
              key={sede.id}
              className={`p-space-md rounded-2xl border flex flex-col justify-between space-y-space-md transition-all ${isOpen ? 'bg-surface-container-low border-outline-variant/30' : 'bg-surface-container-lowest/70 border-error/25 opacity-90'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`px-3 py-1 rounded-full font-label-sm text-[11px] uppercase ${
                      isPrimary
                        ? 'bg-primary-container text-on-primary'
                        : 'bg-secondary-container text-on-secondary-container'
                    }`}
                  >
                    {isPrimary ? 'Sede Principal' : 'Punto Maracumango'}
                  </span>
                  {isOpen ? (
                    <span className="font-label-sm text-tertiary flex items-center gap-1.5 font-semibold text-xs">
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span> Abierto Ahora
                    </span>
                  ) : (
                    <span className="font-label-sm text-error flex items-center gap-1.5 font-semibold text-xs bg-error/10 px-2.5 py-0.5 rounded-full border border-error/25">
                      <span className="w-2 h-2 rounded-full bg-error"></span> Cerrado Hoy
                    </span>
                  )}
                </div>

                {!isOpen && (
                  <div className="mb-3 p-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[11px] font-medium flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">event_busy</span>
                    <span>Esta sede no presta servicio el día de hoy.</span>
                  </div>
                )}
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1">
                  {sede.nombre}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">location_on</span>
                  <span>{sede.direccion}, {sede.ciudad || 'Neiva, Huila'}</span>
                </p>
              </div>

              <div className="p-space-sm rounded-xl bg-surface-container-lowest border border-outline-variant/15 space-y-2">
                <span className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider block mb-1">
                  Horarios y Turnos de Atención
                </span>
                <div className="text-body-sm text-on-surface-variant">
                  <span>{sede.horario || (sede.shifts && sede.shifts.length > 0
                    ? sede.shifts.map((s) => `${s.name}: ${s.startTime.slice(0, 5)} – ${s.endTime.slice(0, 5)}`).join(' | ')
                    : 'Turno Mañana: 7:30 a. m. – 2:30 p. m. | Turno Tarde/Noche: 2:30 p. m. – 11:00 p. m.')}</span>
                </div>
                <div className="flex justify-between items-center text-body-sm pt-2 border-t border-outline-variant/10">
                  <span className="text-on-surface-variant">WhatsApp Domicilios:</span>
                  <a
                    href={`https://wa.me/57${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[#25D366] hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    {sede.whatsapp || sede.phone}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
