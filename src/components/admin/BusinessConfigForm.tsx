import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import type { Sede } from '../../types';

export const BusinessConfigForm: React.FC = () => {
  const { config, updateConfig, sedes, updateSede, addBranch, deleteBranch } = useApp();

  const [activeTab, setActiveTab] = useState<'sedes' | 'identidad'>('sedes');

  // General business identity state
  const [businessName, setBusinessName] = useState(config.businessName || 'Maracumango');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '/logo-maracumango.png');
  const [mainAddress, setMainAddress] = useState(config.mainAddress || 'Cra. 7 / Calle 21');
  const [city, setCity] = useState(config.city || 'Neiva, Huila');
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsappNumber || '3177401873');
  const [shiftInfo, setShiftInfo] = useState(config.shiftInfo || '');

  // Sede-specific editing state
  const [selectedSedeId, setSelectedSedeId] = useState<string>('sede-1');
  const [sedeForms, setSedeForms] = useState<Record<string, Partial<Sede>>>({});

  // New Sede Modal state
  const [isNewSedeModalOpen, setIsNewSedeModalOpen] = useState(false);
  const [newSedeNombre, setNewSedeNombre] = useState('');
  const [newSedeDireccion, setNewSedeDireccion] = useState('');
  const [newSedeCiudad, setNewSedeCiudad] = useState('Neiva, Huila');
  const [newSedeWhatsapp, setNewSedeWhatsapp] = useState('');
  const [newSedeHorario, setNewSedeHorario] = useState('Jornada Continua: 10:00 a.m. – 10:00 p.m.');

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when config or sedes change
  useEffect(() => {
    setBusinessName(config.businessName || 'Maracumango');
    setLogoUrl(config.logoUrl || '/logo-maracumango.png');
    setMainAddress(config.mainAddress || 'Cra. 7 / Calle 21');
    setCity(config.city || 'Neiva, Huila');
    setWhatsappNumber(config.whatsappNumber || '3177401873');
    setShiftInfo(config.shiftInfo || '');
  }, [config]);

  useEffect(() => {
    if (sedes && sedes.length > 0) {
      const map: Record<string, Partial<Sede>> = {};
      sedes.forEach((s) => {
        map[s.id] = {
          nombre: s.nombre,
          direccion: s.direccion,
          ciudad: s.ciudad || 'Neiva, Huila',
          whatsapp: s.whatsapp,
          phone: s.phone || s.whatsapp,
          horario: s.horario || '',
          activa: s.activa !== false,
        };
      });
      setSedeForms(map);
      if (!map[selectedSedeId] && sedes[0]) {
        setSelectedSedeId(sedes[0].id);
      }
    }
  }, [sedes]);

  // Handle Logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateConfig({
        businessName: businessName.trim(),
        logoUrl: logoUrl.trim(),
        mainAddress: mainAddress.trim(),
        city: city.trim(),
        whatsappNumber: whatsappNumber.trim(),
        shiftInfo: shiftInfo.trim(),
      });
      setSuccessMessage('Identidad visual y configuración general guardada con éxito.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar configuración general.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSedeFieldChange = (sedeId: string, field: keyof Sede, value: any) => {
    setSedeForms((prev) => ({
      ...prev,
      [sedeId]: {
        ...prev[sedeId],
        [field]: value,
      },
    }));
  };

  const handleSedeSubmit = async (sedeId: string, e: React.FormEvent) => {
    e.preventDefault();
    const data = sedeForms[sedeId];
    if (!data) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await updateSede(sedeId, {
        nombre: (data.nombre || '').trim(),
        direccion: (data.direccion || '').trim(),
        ciudad: (data.ciudad || 'Neiva, Huila').trim(),
        whatsapp: (data.whatsapp || '').trim(),
        phone: (data.whatsapp || '').trim(),
        horario: (data.horario || '').trim(),
        activa: data.activa !== false,
      });

      setSuccessMessage(`Datos de "${data.nombre}" actualizados y guardados en la base de datos.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar la información de la sede.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewSede = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSedeNombre.trim() || !newSedeDireccion.trim() || !newSedeWhatsapp.trim()) {
      setErrorMessage('Por favor completa el nombre, dirección y WhatsApp de la nueva sede.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await addBranch({
        nombre: newSedeNombre.trim(),
        direccion: newSedeDireccion.trim(),
        ciudad: newSedeCiudad.trim() || 'Neiva, Huila',
        whatsapp: newSedeWhatsapp.trim(),
        phone: newSedeWhatsapp.trim(),
        horario: newSedeHorario.trim(),
      });

      if (res.success) {
        setSuccessMessage(`¡Sede "${newSedeNombre}" creada exitosamente en la base de datos!`);
        setIsNewSedeModalOpen(false);
        setNewSedeNombre('');
        setNewSedeDireccion('');
        setNewSedeWhatsapp('');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Error al crear la sede.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSede = async (sedeId: string, sedeName: string) => {
    if (sedes.length <= 1) {
      alert('Debe existir al menos una sede activa en el sistema.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar completamente la sede "${sedeName}"? Se borrará de forma definitiva de la base de datos.`)) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await deleteBranch(sedeId);
      if (res.success) {
        setSuccessMessage(`Sede "${sedeName}" eliminada permanentemente.`);
        const remaining = sedes.filter((s) => s.id !== sedeId);
        if (remaining.length > 0) {
          setSelectedSedeId(remaining[0].id);
        }
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || 'Error al eliminar sede.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentSedeData = sedeForms[selectedSedeId] || {};
  const currentSedeOriginal = sedes.find((s) => s.id === selectedSedeId);

  return (
    <div className="flex justify-center w-full">
      <div className="bg-surface-container-lowest rounded-3xl p-space-lg shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] border border-outline-variant/20 w-full max-w-4xl space-y-space-lg animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md border-b border-outline-variant/20 gap-3">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">storefront</span>
              Configuración de Sedes & Negocio
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              La información configurada aquí se sincroniza directamente con la base de datos y se muestra en toda la aplicación.
            </p>
          </div>

          {/* Subtabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-container rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('sedes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'sedes'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">store</span>
              <span>Sedes de Neiva</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('identidad')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'identidad'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">palette</span>
              <span>Identidad & Marca</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-error-container/30 border border-error/20 text-error text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: SEDES DE NEIVA */}
        {activeTab === 'sedes' && (
          <div className="space-y-6">
            {/* Sede selector pills with + Nueva Sede button */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/15 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mr-1">
                  Sedes ({sedes.filter((s) => s.activa !== false).length}):
                </span>
                {sedes.filter((s) => s.activa !== false).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSedeId(s.id)}
                    className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      selectedSedeId === s.id
                        ? 'bg-primary-container text-on-primary border-primary shadow-sm'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">location_on</span>
                    <span>{s.nombre}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsNewSedeModalOpen(true)}
                className="px-4 py-2 rounded-2xl bg-secondary-container text-on-secondary-container font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-secondary transition-all shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                <span>+ Nueva Sede</span>
              </button>
            </div>

            {/* Sede Editing Form */}
            {currentSedeOriginal && (
              <form onSubmit={(e) => handleSedeSubmit(selectedSedeId, e)} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-primary-container/10 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                    <span className="material-symbols-outlined text-[20px]">edit_location</span>
                    <span>Editando: {currentSedeOriginal.nombre}</span>
                  </div>
                  <span className="text-xs bg-surface-container-lowest px-2.5 py-1 rounded-lg font-mono font-bold text-on-surface border border-outline-variant/20">
                    ID: {selectedSedeId}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Nombre Oficial de la Sede *
                  </label>
                  <input
                    type="text"
                    required
                    value={currentSedeData.nombre || ''}
                    onChange={(e) => handleSedeFieldChange(selectedSedeId, 'nombre', e.target.value)}
                    placeholder="Ej. Sede Parque del Amor y la Amistad"
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                      Dirección Física en Neiva *
                    </label>
                    <input
                      type="text"
                      required
                      value={currentSedeData.direccion || ''}
                      onChange={(e) => handleSedeFieldChange(selectedSedeId, 'direccion', e.target.value)}
                      placeholder="Ej. Cra. 7 / Calle 21"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                      Ciudad / Municipio *
                    </label>
                    <input
                      type="text"
                      required
                      value={currentSedeData.ciudad || 'Neiva, Huila'}
                      onChange={(e) => handleSedeFieldChange(selectedSedeId, 'ciudad', e.target.value)}
                      placeholder="Neiva, Huila"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                      Teléfono / WhatsApp de la Sede *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-on-surface-variant text-sm font-semibold">
                        +57
                      </span>
                      <input
                        type="text"
                        required
                        value={currentSedeData.whatsapp || ''}
                        onChange={(e) => handleSedeFieldChange(selectedSedeId, 'whatsapp', e.target.value)}
                        placeholder="3177401873"
                        className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant">Visible a clientes para pedidos de esta sede</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                      Horario / Información de Turnos
                    </label>
                    <input
                      type="text"
                      value={currentSedeData.horario || ''}
                      onChange={(e) => handleSedeFieldChange(selectedSedeId, 'horario', e.target.value)}
                      placeholder="Turno 1: 7:30 AM – 2:30 PM | Turno 2: 2:30 PM – 11:00 PM"
                      className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id={`activa-${selectedSedeId}`}
                    checked={currentSedeData.activa !== false}
                    onChange={(e) => handleSedeFieldChange(selectedSedeId, 'activa', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor={`activa-${selectedSedeId}`} className="text-xs font-semibold text-on-surface cursor-pointer">
                    Sede operativa activa (disponible para clientes y trabajadores)
                  </label>
                </div>

                <div className="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleDeleteSede(selectedSedeId, currentSedeOriginal?.nombre || 'Sede')}
                    className="px-4 py-2 rounded-xl bg-error/10 hover:bg-error/20 border border-error/30 text-error font-semibold text-xs transition-colors flex items-center gap-1.5 active:scale-95"
                    title="Eliminar sede definitivamente de la base de datos"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                    <span>Eliminar Sede Permanentemente</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-2xl bg-primary-container text-on-primary font-bold text-sm shadow-md hover:bg-primary transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>{isSaving ? 'Guardando en Base de Datos...' : `Guardar Cambios de ${currentSedeData.nombre || 'Sede'}`}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Modal para Crear Nueva Sede */}
            {isNewSedeModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-6 shadow-2xl border border-outline-variant/30 max-h-[92vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[20px]">add_location_alt</span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-base font-bold text-on-surface">
                          Agregar Nueva Sede en Neiva
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          Se guardará en Neon PostgreSQL y estará disponible de inmediato
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNewSedeModalOpen(false)}
                      className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>

                  <form onSubmit={handleCreateNewSede} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Nombre de la Sede *
                      </label>
                      <input
                        type="text"
                        required
                        value={newSedeNombre}
                        onChange={(e) => setNewSedeNombre(e.target.value)}
                        placeholder="Ej: Sede Sur - Canaima o Sede Ipanema"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Dirección Física en Neiva *
                      </label>
                      <input
                        type="text"
                        required
                        value={newSedeDireccion}
                        onChange={(e) => setNewSedeDireccion(e.target.value)}
                        placeholder="Ej: Calle 8 Sur # 22-10, Barrio Canaima"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-on-surface mb-1">
                          Ciudad
                        </label>
                        <input
                          type="text"
                          value={newSedeCiudad}
                          onChange={(e) => setNewSedeCiudad(e.target.value)}
                          placeholder="Neiva, Huila"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-on-surface mb-1">
                          WhatsApp de Pedidos *
                        </label>
                        <input
                          type="tel"
                          required
                          value={newSedeWhatsapp}
                          onChange={(e) => setNewSedeWhatsapp(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 3177401873"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1">
                        Horario de Atención
                      </label>
                      <input
                        type="text"
                        value={newSedeHorario}
                        onChange={(e) => setNewSedeHorario(e.target.value)}
                        placeholder="Jornada Continua: 10:00 a.m. – 10:00 p.m."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div className="pt-3 border-t border-outline-variant/20 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setIsNewSedeModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold shadow-md hover:bg-primary transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                        <span>{isSaving ? 'Creando Sede...' : 'Crear Sede'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IDENTIDAD GENERAL */}
        {activeTab === 'identidad' && (
          <form onSubmit={handleGeneralSubmit} className="space-y-space-md">
            {/* Logo e Identidad Visual */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-label-lg font-semibold">
                  <span className="material-symbols-outlined text-[20px]">palette</span>
                  <span>Logotipo e Identidad Visual</span>
                </div>
                <span className="text-[11px] bg-tertiary-container/20 text-tertiary px-2 py-0.5 rounded-full font-semibold">
                  Se actualiza en toda la web
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="p-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shrink-0">
                  <img
                    src={logoUrl}
                    alt="Logo Preview"
                    className="h-16 w-auto object-contain"
                  />
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-semibold cursor-pointer hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined text-[18px] text-primary">upload_file</span>
                    <span>Subir nuevo archivo de logotipo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-on-surface-variant">
                    Recomendado: imagen PNG con fondo transparente (máx. 500x200px)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Nombre Comercial del Negocio *
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Dirección Principal de Referencia *
                </label>
                <input
                  type="text"
                  required
                  value={mainAddress}
                  onChange={(e) => setMainAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  WhatsApp Corporativo Principal *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-on-surface-variant text-sm font-semibold">
                    +57
                  </span>
                  <input
                    type="text"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                Información Global de Turnos
              </label>
              <input
                type="text"
                value={shiftInfo}
                onChange={(e) => setShiftInfo(e.target.value)}
                placeholder="Turno 1: 7:30 a.m. – 2:30 p.m. | Turno 2: 2:30 p.m. – 11:00 p.m."
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary text-sm"
              />
            </div>

            <div className="pt-4 border-t border-outline-variant/20 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-2xl bg-primary-container text-on-primary font-bold text-sm shadow-md hover:bg-primary transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>{isSaving ? 'Guardando...' : 'Guardar Identidad & Configuración'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
