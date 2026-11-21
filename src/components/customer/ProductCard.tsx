import React, { useState } from 'react';
import type { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { PRODUCT_INGREDIENTS } from '../../data/mockData';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState<number>(1);
  const [showIngredients, setShowIngredients] = useState<boolean>(false);

  const ingredientsList =
    product.ingredients && product.ingredients.length > 0
      ? product.ingredients
      : PRODUCT_INGREDIENTS[product.id] || ['Pulpa natural de fruta', 'Hielo frapeado', 'Ingredientes de la casa'];

  const getCategoryBadgeClass = (category: string) => {
    const norm = (category || '').toLowerCase().trim();
    if (norm.includes('granizado')) {
      return 'bg-primary-container/20 text-primary border-primary/30';
    }
    if (norm.includes('michelada')) {
      return 'bg-amber-500 text-white border-amber-600 shadow-sm font-bold';
    }
    if (norm.includes('helado')) {
      return 'bg-tertiary-container text-on-tertiary border-tertiary shadow-sm font-semibold';
    }
    return 'bg-surface-container-high text-on-surface border-outline-variant/30';
  };

  const handleAdd = () => {
    addToCart(product, quantity);
    setQuantity(1);
  };

  return (
    <div className="group bg-surface-container-lowest rounded-3xl p-space-md shadow-[0_4px_20px_-2px_rgba(106,191,0,0.08)] hover:shadow-[0_12px_28px_-4px_rgba(106,191,0,0.20)] transition-all duration-300 flex flex-col justify-between border border-outline-variant/10 relative">
      {/* Top Image Container */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-space-md bg-surface-container-low">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        />
        {/* Category Pill Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span
            className={`px-3 py-1 rounded-full font-label-sm text-[11px] uppercase tracking-wider border backdrop-blur-md ${getCategoryBadgeClass(
              product.category
            )}`}
          >
            {product.category}
          </span>
          {product.popular && (
            <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-wider bg-secondary-container text-on-secondary-container font-bold shadow-sm">
              ★ Popular
            </span>
          )}
        </div>

        {/* View Ingredients Quick Button on Image */}
        <button
          type="button"
          onClick={() => setShowIngredients(!showIngredients)}
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-label-sm text-[11px] shadow-sm hover:bg-surface-container flex items-center gap-1 border border-outline-variant/20 transition-all"
          title="Ver ingredientes del producto"
        >
          <span className="material-symbols-outlined text-[15px] text-primary">nutrition</span>
          <span>{showIngredients ? 'Ocultar' : 'Ingredientes'}</span>
        </button>
      </div>

      {/* Content Section */}
      <div className="flex flex-col flex-1 justify-between space-y-space-sm">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
            {product.description}
          </p>

          {/* Expandable Ingredients Details */}
          {showIngredients && (
            <div className="mt-3 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 animate-fadeIn">
              <div className="flex items-center gap-1.5 mb-2 text-primary font-label-md text-xs font-semibold">
                <span className="material-symbols-outlined text-[15px]">eco</span>
                <span>Ingredientes frescos:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ingredientsList.map((ing, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-surface-container-lowest text-[11px] text-on-surface border border-outline-variant/15 font-medium"
                  >
                    • {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Strip: Price + Quantity Controls + Add Button */}
        <div className="pt-space-xs border-t border-outline-variant/15 flex items-center justify-between gap-space-xs">
          <div className="flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
              Precio
            </span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
              ${product.price.toLocaleString('es-CO')}
            </span>
          </div>

          <div className="flex items-center gap-space-xs">
            {/* Quantity Selector Capsules */}
            <div className="flex items-center bg-surface-container-low rounded-xl p-1 border border-outline-variant/20">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Disminuir cantidad"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span className="w-7 text-center font-label-md text-label-md text-on-surface">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Aumentar cantidad"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAdd}
              className="px-space-md py-space-xs rounded-xl bg-primary-container text-on-primary font-label-md text-label-md shadow-md hover:bg-primary active:scale-95 transition-all flex items-center gap-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
              <span className="hidden sm:inline">Agregar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
