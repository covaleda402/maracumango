import React, { useState, useEffect } from 'react';
import type { Product, Category } from '../../types';
import { useApp } from '../../context/AppContext';
import { PRODUCT_INGREDIENTS } from '../../data/mockData';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const COMMON_INGREDIENTS = [
  'Hielo frapeado',
  'Pulpa de maracuyá',
  'Pulpa de mango biche',
  'Escarchado de tajín',
  'Leche condensada',
  'Chamoy artesanal',
  'Zumo de limón fresco',
  'Sal marina',
  'Gomitas tricolores',
  'Cerveza helada',
  'Gelato artesanal mango-maracuyá',
  'Barquillo crocante',
];

// Helper to strictly ensure we have a valid string
const ensureString = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val);
};

// Helper to strictly ensure we have an Array of strings
const ensureArray = (val: any): string[] => {
  if (Array.isArray(val)) {
    return val.map((s) => String(s || '').trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s || '').trim()).filter(Boolean);
      }
    } catch {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct, categories } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Granizados');
  const [price, setPrice] = useState<number>(12000);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('/images/granizado.png');
  const [popular, setPopular] = useState(false);
  const [active, setActive] = useState(true);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrorMessage(null);
    if (productToEdit) {
      setName(ensureString(productToEdit.name));
      setCategory(productToEdit.category || (categories[0]?.name ?? 'Granizados'));
      setPrice(Number(productToEdit.price) || 0);
      setDescription(ensureString(productToEdit.description));
      setImage(ensureString(productToEdit.image) || '/images/granizado.png');
      setPopular(!!productToEdit.popular);
      setActive(productToEdit.active !== false);

      const resolvedIngs = ensureArray(
        productToEdit.ingredients ||
          (productToEdit.id ? PRODUCT_INGREDIENTS[productToEdit.id] : null)
      );
      setIngredients(
        resolvedIngs.length > 0 ? resolvedIngs : ['Hielo frapeado', 'Pulpa de maracuyá']
      );
    } else {
      setName('');
      const defaultCat = categories.length > 0 ? categories[0].name : 'Granizados';
      setCategory(defaultCat);
      setPrice(12000);
      setDescription('');
      setImage('/images/granizado.png');
      setPopular(false);
      setActive(true);
      setIngredients(['Hielo frapeado', 'Pulpa natural']);
    }
  }, [productToEdit, isOpen, categories]);

  if (!isOpen) return null;

  // Handle direct file upload via browser
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage('La imagen no debe superar los 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddIngredient = (ing: string) => {
    const trimmed = ing.trim();
    if (!trimmed) return;
    const currentList = Array.isArray(ingredients) ? ingredients : [];
    if (!currentList.includes(trimmed)) {
      setIngredients([...currentList, trimmed]);
    }
    setNewIngredientInput('');
  };

  const handleRemoveIngredient = (ingToRemove: string) => {
    const currentList = Array.isArray(ingredients) ? ingredients : [];
    setIngredients(currentList.filter((i) => i !== ingToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }
    if (price <= 0 || isNaN(price)) {
      setErrorMessage('El precio debe ser un número mayor a cero.');
      return;
    }

    const selectedCatObj = categories.find((c) => c.name === category || c.id === category);
    const catId = selectedCatObj?.id || (categories[0]?.id ?? 'cat-1');
    const catName = selectedCatObj?.name || category || 'Granizados';

    const cleanIngredients = Array.isArray(ingredients)
      ? ingredients.map((i) => String(i).trim()).filter(Boolean)
      : [];

    setIsSubmitting(true);
    try {
      if (productToEdit) {
        await updateProduct({
          ...productToEdit,
          name: trimmedName,
          category: catName,
          categoryId: catId,
          price: Number(price),
          description: description.trim(),
          image: image.trim() || '/images/granizado.png',
          popular,
          active,
          ingredients: cleanIngredients,
        });
      } else {
        await addProduct({
          name: trimmedName,
          category: catName,
          categoryId: catId,
          price: Number(price),
          description: description.trim(),
          image: image.trim() || '/images/granizado.png',
          popular,
          active,
          ingredients: cleanIngredients,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al persistir el producto en la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeIngredients = Array.isArray(ingredients) ? ingredients : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl p-6 bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/30 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">
              {productToEdit ? 'edit' : 'add_circle'}
            </span>
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {productToEdit ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-error-container/20 border border-error/30 flex items-center gap-2 text-error text-xs font-semibold">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Nombre del Producto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Granizado Mango Biche Especial"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Categoría *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {category && !categories.some((c) => c.name === category) && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Precio (COP) *
              </label>
              <input
                type="number"
                required
                min={500}
                step={500}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-1">
              Descripción Breve
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del sabor y presentación..."
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Subida o selección de imagen */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3">
            <label className="block font-label-md text-label-md text-on-surface">
              Imagen del Producto
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant/30 bg-surface shrink-0">
                <img
                  src={image || '/images/granizado.png'}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/images/granizado.png';
                  }}
                />
              </div>

              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-semibold cursor-pointer hover:bg-surface-container transition-all">
                  <span className="material-symbols-outlined text-[18px] text-primary">upload_file</span>
                  <span>Subir imagen desde mi dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="text-on-surface-variant">O elegir diseño:</span>
                  <button
                    type="button"
                    onClick={() => setImage('/images/granizado.png')}
                    className={`px-2 py-0.5 rounded-lg border ${
                      image === '/images/granizado.png'
                        ? 'bg-primary-container text-on-primary border-primary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    Granizado
                  </button>
                  <button
                    type="button"
                    onClick={() => setImage('/images/michelada.png')}
                    className={`px-2 py-0.5 rounded-lg border ${
                      image === '/images/michelada.png'
                        ? 'bg-secondary-container text-on-secondary-container border-secondary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    Michelada
                  </button>
                  <button
                    type="button"
                    onClick={() => setImage('/images/helado.png')}
                    className={`px-2 py-0.5 rounded-lg border ${
                      image === '/images/helado.png'
                        ? 'bg-tertiary-container text-on-tertiary border-tertiary'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    Helado
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Gestión de ingredientes */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block font-label-md text-label-md text-on-surface">
                Ingredientes del Producto
              </label>
              <span className="text-xs text-on-surface-variant">
                Visible para clientes y trabajadores
              </span>
            </div>

            {/* Chips de ingredientes asignados */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/20">
              {safeIngredients.length === 0 ? (
                <span className="text-xs text-on-surface-variant italic">
                  Sin ingredientes asignados. Agrega abajo.
                </span>
              ) : (
                safeIngredients.map((ing) => (
                  <span
                    key={ing}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-container/15 text-primary text-xs font-semibold"
                  >
                    {ing}
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(ing)}
                      className="hover:text-error transition-colors"
                      title="Quitar ingrediente"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input para agregar ingrediente personalizado */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newIngredientInput}
                onChange={(e) => setNewIngredientInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddIngredient(newIngredientInput);
                  }
                }}
                placeholder="Escribe un ingrediente y presiona Enter..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => handleAddIngredient(newIngredientInput)}
                className="px-3 py-1.5 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all"
              >
                + Agregar
              </button>
            </div>

            {/* Sugerencias rápidas */}
            <div>
              <span className="text-[11px] text-on-surface-variant block mb-1">
                Sugerencias rápidas:
              </span>
              <div className="flex flex-wrap gap-1">
                {COMMON_INGREDIENTS.filter((ci) => !safeIngredients.includes(ci))
                  .slice(0, 6)
                  .map((ci) => (
                    <button
                      key={ci}
                      type="button"
                      onClick={() => handleAddIngredient(ci)}
                      className="px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-on-surface hover:bg-surface-container-high transition-colors"
                    >
                      + {ci}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-label-md text-on-surface">
              <input
                type="checkbox"
                checked={popular}
                onChange={(e) => setPopular(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span>Marcar como Popular ★</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-label-md text-on-surface">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary"
              />
              <span>Producto Activo</span>
            </label>
          </div>

          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md shadow-md hover:bg-primary transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : productToEdit ? 'Guardar Cambios' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
