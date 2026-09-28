import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SEDES } from '../../data/sedes';
import type { AppUser } from '../../types';

export const StaffManager: React.FC = () => {
  const {
    currentUser,
    staffUsers,
    loadStaffUsers,
    createStaffUser,
    updateStaffUser,
    deleteStaffUser,
    sedes,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<'ADMIN' | 'WORKER'>('WORKER');
  const [branchId, setBranchId] = useState<string>('sede-1');
  const [active, setActive] = useState<boolean>(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchesList = sedes.length > 0 ? sedes : SEDES;

  useEffect(() => {
    loadStaffUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRoleId('WORKER');
    setBranchId('sede-1');
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: AppUser) => {
    setEditingUser(user);
    setFirstName(user.firstName || user.name.split(' ')[0] || '');
    setLastName(user.lastName || user.name.split(' ').slice(1).join(' ') || '');
    setEmail(user.email);
    setPassword(''); // leave blank if keeping same password
    const rawRole = (user.role || (user as any).roleId || 'WORKER').toString().toUpperCase();
    setRoleId(rawRole === 'ADMIN' ? 'ADMIN' : 'WORKER');
    setBranchId(user.branchId || 'sede-1');
    setActive(user.active !== false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Frontend validations
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Name validation: no numbers
    if (/\d/.test(cleanFirst) || /\d/.test(cleanLast)) {
      setFormError('El nombre y apellido no deben contener números.');
      return;
    }

    if (!cleanFirst) {
      setFormError('El nombre es obligatorio.');
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }

    if (!editingUser && (!password || password.length < 6)) {
      setFormError('La contraseña inicial debe tener al menos 6 caracteres.');
      return;
    }

    if (roleId === 'WORKER' && !branchId) {
      setFormError('Debes asignar una sede operativa al trabajador.');
      return;
    }

    if (editingUser) {
      const isOriginalAdmin = (editingUser.role || (editingUser as any).roleId || '').toString().toUpperCase() === 'ADMIN';
      if (editingUser.id === currentUser?.id && roleId !== 'ADMIN') {
        setFormError('Por seguridad, no puedes removerte el rol de Administrador a ti mismo.');
        return;
      }
      if (isOriginalAdmin && roleId === 'WORKER') {
        const confirmed = window.confirm(`¿Estás seguro de que deseas degradar al administrador ${editingUser.name || editingUser.email} a Trabajador?`);
        if (!confirmed) {
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        // Update user
        const updateData: any = {
          firstName: cleanFirst,
          lastName: cleanLast || null,
          roleId,
          branchId: roleId === 'WORKER' ? branchId : null,
          active,
        };
        if (password && password.length >= 6) {
          updateData.newPassword = password;
        }

        const res = await updateStaffUser(editingUser.id, updateData);
        if (res.success) {
          setIsModalOpen(false);
        } else {
          setFormError(res.error || 'Error al actualizar el usuario.');
        }
      } else {
        // Create user
        const res = await createStaffUser({
          firstName: cleanFirst,
          lastName: cleanLast || null,
          email: cleanEmail,
          password,
          roleId,
          branchId: roleId === 'WORKER' ? branchId : null,
        });

        if (res.success) {
          setIsModalOpen(false);
        } else {
          setFormError(res.error || 'Error al registrar el usuario.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      alert('No puedes desactivar tu propia cuenta administradora activa.');
      return;
    }
    const newActiveState = !(user.active !== false);
    await updateStaffUser(user.id, {
      firstName: user.firstName,
      lastName: user.lastName,
      roleId: user.role,
      branchId: user.branchId,
      active: newActiveState,
    });
  };

  const handleDelete = async (user: AppUser) => {
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta administradora activa.');
      return;
    }
    const isTargetAdmin = (user.role || (user as any).roleId || '').toString().toUpperCase() === 'ADMIN';
    const confirmMsg = isTargetAdmin
      ? `¿Estás seguro de que deseas eliminar al Administrador "${user.name || user.email}"? Esta acción eliminará su cuenta en la base de datos.`
      : `¿Estás seguro de que deseas eliminar al Colaborador "${user.name || user.email}"?`;

    if (confirm(confirmMsg)) {
      await deleteStaffUser(user.id);
    }
  };

  return (
    <div className="space-y-space-md animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-surface-container-lowest rounded-3xl p-space-md border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">group</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Equipo de Trabajo y Roles
            </h2>
          </div>
          <p className="text-body-sm text-on-surface-variant text-xs mt-1">
            Gestiona los accesos de administradores y el personal operativo asignado a cada sede.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-2xl bg-primary-container text-on-primary font-label-md text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary transition-all shadow-md shrink-0 active:scale-98"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>+ Nuevo Colaborador</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/15 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs font-semibold uppercase border-b border-outline-variant/20">
                <th className="p-4">Colaborador</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol en Sistema</th>
                <th className="p-4">Sede Operativa</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-sm">
              {staffUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    No se encontraron colaboradores registrados en la base de datos.
                  </td>
                </tr>
              ) : (
                staffUsers.map((user) => {
                  const isCurrent = user.id === currentUser?.id;
                  const isActive = user.active !== false;
                  const sedeObj = branchesList.find((s) => s.id === user.branchId);

                  return (
                    <tr key={user.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              user.role === 'ADMIN'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-primary-container text-on-primary'
                            }`}
                          >
                            {(user.firstName || user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-1.5">
                              <span>{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-primary-container/20 text-primary px-2 py-0.5 rounded-full font-bold">
                                  Tú
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-on-surface-variant">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-on-surface-variant font-mono text-xs">
                        {user.email}
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            user.role === 'ADMIN'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-primary-container/20 text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {user.role === 'ADMIN' ? 'admin_panel_settings' : 'blender'}
                          </span>
                          <span>{user.role === 'ADMIN' ? 'Administrador' : 'Trabajador'}</span>
                        </span>
                      </td>

                      <td className="p-4">
                        {user.role === 'ADMIN' ? (
                          <span className="text-xs text-on-surface-variant font-medium">
                            🌐 Ambas Sedes (Global)
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-on-surface">
                            📍 {sedeObj?.nombre || user.branchName || user.branchId || 'No asignada'}
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={isCurrent}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-error-container/20 text-error border-error/30 hover:bg-error-container/30'
                          } ${isCurrent ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                          title={isCurrent ? 'Tu cuenta activa' : 'Clic para cambiar estado'}
                        >
                          {isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors"
                            title="Editar usuario o contraseña"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-2 rounded-xl bg-surface-container text-error hover:bg-error-container/20 transition-colors"
                              title={user.role === 'ADMIN' ? 'Eliminar Administrador' : 'Eliminar Colaborador'}
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Dialog for Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg p-6 bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  {editingUser ? 'manage_accounts' : 'person_add'}
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  {editingUser ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-2xl bg-error-container/30 border border-error/20 flex items-center gap-2 text-error text-xs font-medium">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="Ej. Carlos"
                    className="w-full px-3.5 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary"
                    required
                  />
                  <span className="text-[10px] text-on-surface-variant">Solo letras, sin números</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value.replace(/[0-9]/g, ''))}
                    placeholder="Ej. Gómez"
                    className="w-full px-3.5 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-on-surface-variant">Solo letras, sin números</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@maracumango.com"
                  disabled={!!editingUser}
                  className="w-full px-3.5 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary disabled:opacity-60"
                  required
                />
                {editingUser && (
                  <span className="text-[10px] text-on-surface-variant">El email es el identificador único</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para mantener actual)' : 'Contraseña Inicial *'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Opcional (mínimo 6 caracteres)' : 'Mínimo 6 caracteres'}
                  className="w-full px-3.5 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary"
                  {...(!editingUser ? { required: true, minLength: 6 } : {})}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    Rol en el Sistema *
                  </label>
                  <select
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value as 'ADMIN' | 'WORKER')}
                    className="w-full px-3.5 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="WORKER">Trabajador Operativo (Cocina/Barra)</option>
                    <option value="ADMIN">Administrador Completo</option>
                  </select>
                </div>

                {roleId === 'WORKER' && (
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                      Sede Asignada *
                    </label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-container rounded-2xl border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                      required
                    >
                      {branchesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-on-surface-variant">Aislado a esta sede</span>
                  </div>
                )}
              </div>

              {editingUser && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="userActive"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <label htmlFor="userActive" className="text-xs font-semibold text-on-surface cursor-pointer">
                    Cuenta Activa (permite inicio de sesión)
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-surface-container text-on-surface font-label-md text-xs hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-2xl bg-primary-container text-on-primary font-label-md text-xs font-bold hover:bg-primary transition-all shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar Colaborador' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
