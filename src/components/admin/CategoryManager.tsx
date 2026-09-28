import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { CategoryItem } from '../../types';

export const CategoryManager: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, products } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const openAddModal = () => {
    setActionError(null);
    setEditingCategory(null);
    setName('');
    setDescription('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setActionError(null);
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setActive(cat.active);
    setIsModalOpen(true);
  };

  const handleDelete = async (cat: CategoryItem) => {
    setActionError(null);
    setActionSuccess(null);

    const associatedCount = products.filter(
      (p) => p.category === cat.name || p.categoryId === cat.id
    ).length;

    if (associatedCount > 0) {
      setActionError(
        `No es posible eliminar la categoría "${cat.name}" porque tiene ${associatedCount} producto(s) asociado(s). Reasigna o elimina los productos antes de borrarla.`
      );
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar permanentemente la categoría "${cat.name}"? Esta acción se guardará en la base de datos.`)) {
      return;
    }

    try {
      await deleteCategory(cat.id);
      setActionSuccess(`Categoría "${cat.name}" eliminada exitosamente.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setActionError(err.message || 'Error al eliminar la categoría en el servidor.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setActionError(null);
    try {
      if (editingCategory) {
        await updateCategory({
          ...editingCategory,
          name: name.trim(),
          description: description.trim(),
          active,
        });
        setActionSuccess(`Categoría "${name.trim()}" actualizada exitosamente.`);
      } else {
        await addCategory({
          name: name.trim(),
          description: description.trim(),
          active,
          order: categories.length + 1,
        });
        setActionSuccess(`Categoría "${name.trim()}" creada exitosamente.`);
      }
      setTimeout(() => setActionSuccess(null), 4000);
      setIsModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || 'Error al guardar la categoría.');
    }
  };

  return (
    <div className="space-y-space-lg animate-fadeIn">
      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-error-container/20 border border-error/30 text-error flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-error hover:opacity-75">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-tertiary-container/20 border border-tertiary/30 text-tertiary flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-tertiary hover:opacity-75">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-space-md rounded-3xl border border-outline-variant/20">
        <div>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-container/15 text-primary text-xs font-semibold uppercase tracking-wider mb-2">
            <span className="material-symbols-outlined text-[14px]">category</span>
            Catálogo & Organización
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Gestión de Categorías
          </h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Administra las secciones que estructuran el menú para los clientes y el personal de barra.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-3 rounded-2xl bg-primary-container text-on-primary font-label-md font-semibold hover:bg-primary shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {categories.map((cat) => {
          const productCount = products.filter((p) => p.category === cat.name).length;

          return (
            <div
              key={cat.id}
              className="bg-surface-container-lowest rounded-3xl p-space-md border border-outline-variant/20 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[24px]">
                      local_cafe
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {cat.name}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                      cat.active
                        ? 'bg-tertiary-container/20 text-tertiary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {cat.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                <p className="text-body-sm text-on-surface-variant line-clamp-2">
                  {cat.description || 'Sin descripción detallada asignada.'}
                </p>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container-low text-xs text-on-surface font-medium border border-outline-variant/15">
                  <span className="material-symbols-outlined text-[16px] text-primary">fastfood</span>
                  <span>{productCount} producto{productCount !== 1 ? 's' : ''} asociado{productCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/15">
                <button
                  onClick={() => openEditModal(cat)}
                  className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-highest text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  <span>Editar</span>
                </button>

                <button
                  onClick={() => handleDelete(cat)}
                  className="px-3 py-1.5 rounded-xl bg-error-container/20 text-error hover:bg-error-container text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-on-surface/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface rounded-3xl p-space-lg shadow-2xl border border-outline-variant/30 space-y-space-md animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Granizados, Micheladas, Postres"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve reseña sobre los productos de esta categoría..."
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="categoryActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary"
                />
                <label htmlFor="categoryActive" className="text-sm font-medium text-on-surface cursor-pointer">
                  Categoría visible en la tienda
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-primary-container text-on-primary font-semibold text-sm hover:bg-primary transition-all"
                >
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
