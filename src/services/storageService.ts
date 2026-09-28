import type { Product, Order, BusinessConfig, CategoryItem } from '../types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS, DEFAULT_BUSINESS_CONFIG, PRODUCT_INGREDIENTS } from '../data/mockData';
import { SEDES } from '../data/sedes';

const PRODUCTS_KEY = 'maracumango_products_v1';
const ORDERS_KEY = 'maracumango_orders_v2';
const CONFIG_KEY = 'maracumango_config_v2';
const CATEGORIES_KEY = 'maracumango_categories_v1';

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Granizados', description: 'Granizados artesanales a base de pulpa 100% natural', active: true, order: 1 },
  { id: 'cat-2', name: 'Micheladas', description: 'Cervezas escarchadas con frutas y toques especiales', active: true, order: 2 },
  { id: 'cat-3', name: 'Helados', description: 'Copas de helado y gelato artesanal tropical', active: true, order: 3 },
];

export const storageService = {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(PRODUCTS_KEY);
      if (!data) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTS;
    }
  },

  saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Error saving products to localStorage', e);
    }
  },

  getOrders(): Order[] {
    try {
      const data = localStorage.getItem(ORDERS_KEY);
      if (!data) {
        // Check v1 fallback
        const oldData = localStorage.getItem('maracumango_orders_v1');
        if (oldData) {
          try {
            const parsed: Order[] = JSON.parse(oldData);
            const migrated = parsed.map((ord, idx) => ({
              ...ord,
              sedeId: ord.sedeId || (idx % 2 === 0 ? 'sede-1' : 'sede-2'),
              sedeNombre: ord.sedeNombre || (idx % 2 === 0 ? SEDES[0].nombre : SEDES[1].nombre),
              items: ord.items.map((it) => ({
                ...it,
                ingredients: it.ingredients || PRODUCT_INGREDIENTS[it.productId] || ['Ingredientes seleccionados'],
              })),
            }));
            localStorage.setItem(ORDERS_KEY, JSON.stringify(migrated));
            return migrated;
          } catch {
            // ignore
          }
        }
        localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
        return INITIAL_ORDERS;
      }
      const orders: Order[] = JSON.parse(data);
      return orders.map((ord, idx) => ({
        ...ord,
        sedeId: ord.sedeId || (idx % 2 === 0 ? 'sede-1' : 'sede-2'),
        sedeNombre: ord.sedeNombre || (idx % 2 === 0 ? SEDES[0].nombre : SEDES[1].nombre),
        items: ord.items.map((it) => ({
          ...it,
          ingredients: it.ingredients || PRODUCT_INGREDIENTS[it.productId] || ['Ingredientes de preparación'],
        })),
      }));
    } catch {
      return INITIAL_ORDERS;
    }
  },

  saveOrders(orders: Order[]): void {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Error saving orders to localStorage', e);
    }
  },

  getConfig(): BusinessConfig {
    try {
      const data = localStorage.getItem(CONFIG_KEY);
      if (!data) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_BUSINESS_CONFIG));
        return DEFAULT_BUSINESS_CONFIG;
      }
      const cfg: BusinessConfig = JSON.parse(data);
      return {
        ...DEFAULT_BUSINESS_CONFIG,
        ...cfg,
      };
    } catch {
      return DEFAULT_BUSINESS_CONFIG;
    }
  },

  saveConfig(config: BusinessConfig): void {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving config to localStorage', e);
    }
  },

  getCategories(): CategoryItem[] {
    try {
      const data = localStorage.getItem(CATEGORIES_KEY);
      if (!data) {
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(INITIAL_CATEGORIES));
        return INITIAL_CATEGORIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_CATEGORIES;
    }
  },

  saveCategories(categories: CategoryItem[]): void {
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('Error saving categories to localStorage', e);
    }
  },

  createOrderFallback(orderData: any): Order {
    const existing = this.getOrders();
    const nextNum = 100 + existing.length + 1;
    const subtotal = orderData.items.reduce(
      (acc: number, it: any) => acc + (it.unitPrice || 12000) * it.quantity,
      0
    );
    const fee = orderData.deliveryFee || 0;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `#MMC-${nextNum}`,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      sedeId: orderData.sedeId || 'sede-1',
      sedeNombre: orderData.sedeId === 'sede-2' ? 'Sede Sector Edsbur / Único' : 'Sede Parque del Amor y la Amistad',
      deliveryMethod: orderData.deliveryMethod,
      deliveryAddress: orderData.deliveryAddress,
      paymentMethod: orderData.paymentMethod,
      items: orderData.items,
      subtotal,
      deliveryFee: fee,
      total: subtotal + fee,
      status: 'PENDING_ADMIN',
      statusLabel: 'Pendiente de Aprobación Admin',
      createdAt: new Date().toISOString(),
      notes: orderData.notes,
    };
    const updated = [newOrder, ...existing];
    this.saveOrders(updated);
    return newOrder;
  },
};
