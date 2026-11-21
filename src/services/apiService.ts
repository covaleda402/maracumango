import type {
  Product,
  Order,
  BusinessConfig,
  CategoryItem,
  Sede,
  Ingredient,
  OrderStatus,
  AppUser,
} from '../types';
import { storageService, INITIAL_CATEGORIES } from './storageService';
import { SEDES } from '../data/sedes';
import { PRODUCT_INGREDIENTS } from '../data/mockData';


const BASE_URL = '/api';
const TOKEN_KEY = 'maracumango_auth_token_v1';

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
};

const getHeaders = (role?: string, branchId?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (role) headers['x-user-role'] = role;
  if (branchId) headers['x-branch-id'] = branchId;
  return headers;
};

export const apiService = {
  // --- HEALTHCHECK & STATUS ---
  async checkHealth(): Promise<{ configured: boolean; connected: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        return {
          configured: data.database?.configured ?? false,
          connected: data.database?.connected ?? false,
        };
      }
    } catch {
      // offline/fallback
    }
    return { configured: false, connected: false };
  },

  // --- BRANCHES ---
  async getBranches(): Promise<Sede[]> {
    try {
      const res = await fetch(`${BASE_URL}/branches`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return SEDES;
  },

  async updateBranch(id: string, branchData: Partial<Sede>, role: string = 'admin'): Promise<Sede | null> {
    try {
      const res = await fetch(`${BASE_URL}/branches/${id}`, {
        method: 'PUT',
        headers: getHeaders(role),
        body: JSON.stringify(branchData),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return null;
  },

  async createBranch(
    branchData: { nombre: string; direccion: string; ciudad?: string; whatsapp: string; phone?: string; horario?: string },
    role: string = 'admin'
  ): Promise<{ success: boolean; branch?: Sede; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/branches`, {
        method: 'POST',
        headers: getHeaders(role),
        body: JSON.stringify(branchData),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, branch: data };
      }
      return { success: false, error: data.error || 'Error al crear la sede.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión al crear sede.' };
    }
  },

  async deleteBranch(id: string, role: string = 'admin'): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/branches/${id}`, {
        method: 'DELETE',
        headers: getHeaders(role),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Error al eliminar sede.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch(`${BASE_URL}/products`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    const local = storageService.getProducts();
    return local.map((p) => ({
      ...p,
      ingredients: p.ingredients || PRODUCT_INGREDIENTS[p.id] || [],
    }));
  },

  async createProduct(productData: any, role: string = 'admin'): Promise<Product> {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify(productData),
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'No se pudo guardar el producto en la base de datos.');
  },

  async updateProduct(id: string, productData: any, role: string = 'admin'): Promise<Product> {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(role),
      body: JSON.stringify(productData),
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'No se pudo actualizar el producto en la base de datos.');
  },

  async toggleProductActive(id: string, role: string = 'admin'): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/products/${id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(role),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async deleteProduct(id: string, role: string = 'admin'): Promise<{ success: boolean; deleted?: boolean; message?: string }> {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(role),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, deleted: data.deleted, message: data.message };
    }
    throw new Error(data.error || 'No se pudo procesar la eliminación del producto.');
  },

  // --- INGREDIENTS ---
  async getIngredients(): Promise<Ingredient[]> {
    try {
      const res = await fetch(`${BASE_URL}/ingredients`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return [];
  },

  async createIngredient(name: string, description?: string, role: string = 'admin'): Promise<Ingredient | null> {
    try {
      const res = await fetch(`${BASE_URL}/ingredients`, {
        method: 'POST',
        headers: getHeaders(role),
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return null;
  },

  // --- CATEGORIES ---
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const res = await fetch(`${BASE_URL}/categories`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return storageService.getCategories() || INITIAL_CATEGORIES;
  },

  async createCategory(categoryData: any, role: string = 'admin'): Promise<CategoryItem> {
    const res = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: getHeaders(role),
      body: JSON.stringify(categoryData),
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'No se pudo guardar la categoría en la base de datos.');
  },

  async updateCategory(id: string, categoryData: any, role: string = 'admin'): Promise<CategoryItem> {
    const res = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(role),
      body: JSON.stringify(categoryData),
    });
    if (res.ok) {
      return await res.json();
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'No se pudo actualizar la categoría en la base de datos.');
  },

  async deleteCategory(id: string, role: string = 'admin'): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(role),
    });
    if (res.ok) {
      return true;
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'No se pudo eliminar la categoría.');
  },


  // --- ORDERS ---
  async getOrders(role: string = 'customer', branchId?: string): Promise<Order[]> {
    try {
      const url = branchId && branchId !== 'all' ? `${BASE_URL}/orders?branchId=${branchId}` : `${BASE_URL}/orders`;
      const res = await fetch(url, {
        headers: getHeaders(role, branchId),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    const all = storageService.getOrders();
    if (role === 'worker') {
      return all.filter((o) => o.sedeId === (branchId || 'sede-1') && o.status !== 'PENDING_ADMIN' && o.status !== 'CANCELLED');
    }
    if (branchId && branchId !== 'all') {
      return all.filter((o) => o.sedeId === branchId);
    }
    return all;
  },

  async createOrder(orderPayload: any): Promise<Order> {
    try {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(orderPayload),
      });
      if (res.ok) {
        return await res.json();
      }
      const errorJson = await res.json().catch(() => null);
      if (errorJson?.error) {
        throw new Error(errorJson.error);
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) {
        throw e;
      }
    }
    // Fallback order generation if backend is completely down
    return storageService.createOrderFallback(orderPayload);
  },

  async acceptOrder(orderId: string, role: string = 'admin'): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/confirm`, {
        method: 'PATCH',
        headers: getHeaders(role),
      });
      if (!res.ok) {
        const fallback = await fetch(`${BASE_URL}/orders/${orderId}/accept`, {
          method: 'PATCH',
          headers: getHeaders(role),
        });
        return fallback.ok;
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  async cancelOrder(orderId: string, reason?: string, role: string = 'admin'): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: getHeaders(role),
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const fallback = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: getHeaders(role),
          body: JSON.stringify({ status: 'CANCELLED' }),
        });
        return fallback.ok;
      }
      return res.ok;
    } catch {
      return false;
    }
  },

  async startPreparation(orderId: string, role: string = 'worker', branchId?: string): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/start-preparation`, {
        method: 'PATCH',
        headers: getHeaders(role, branchId),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'No se pudo tomar el pedido.' };
    } catch {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  },

  async downloadSalesReportCsv(branchId?: string): Promise<boolean> {
    try {
      const url = branchId && branchId !== 'all'
        ? `${BASE_URL}/orders/export-csv?branchId=${branchId}`
        : `${BASE_URL}/orders/export-csv`;

      const res = await fetch(url, {
        headers: getHeaders('admin'),
      });

      if (!res.ok) {
        throw new Error('Error al generar el reporte.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `reporte_ventas_maracumango_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    } catch (e) {
      console.error('Error downloading CSV:', e);
      return false;
    }
  },

  async downloadSalesReportExcel(branchId?: string): Promise<boolean> {
    try {
      const url = branchId && branchId !== 'all'
        ? `${BASE_URL}/orders/export-excel?branchId=${branchId}`
        : `${BASE_URL}/orders/export-excel`;

      const res = await fetch(url, {
        headers: getHeaders('admin'),
      });

      if (!res.ok) {
        throw new Error('Error al generar el reporte Excel.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `reporte_ventas_maracumango_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      return true;
    } catch (e) {
      console.error('Error downloading Excel:', e);
      return false;
    }
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, role: string = 'admin', branchId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getHeaders(role, branchId),
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- SETTINGS & BRANDING ---
  async getSettings(): Promise<BusinessConfig> {
    try {
      const res = await fetch(`${BASE_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        return {
          businessName: data.businessName,
          mainAddress: data.mainAddress,
          city: data.city,
          whatsappNumber: data.whatsappNumber,
          shiftInfo: data.shiftInfo,
          logoUrl: data.logoUrl || '/logo-maracumango.png',
          defaultDeliveryFee: 0,
        };
      }
    } catch {
      // fallback
    }
    return storageService.getConfig();
  },

  async updateSettings(settings: Partial<BusinessConfig>, role: string = 'admin'): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: getHeaders(role),
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // --- AUTH & USERS ---
  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; token?: string; user?: AppUser; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAuthToken(data.token);
        return { success: true, token: data.token, user: data.user };
      }
      return { success: false, error: data.error || 'Credenciales inválidas.' };
    } catch {
      return { success: false, error: 'Error de red al conectar con el servidor.' };
    }
  },

  async registerCustomer(customerData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    defaultAddress?: string;
    acceptedTerms: boolean;
  }): Promise<{ success: boolean; token?: string; user?: AppUser; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAuthToken(data.token);
        return { success: true, token: data.token, user: data.user };
      }
      return { success: false, error: data.error || 'Error al registrar cliente.' };
    } catch {
      return { success: false, error: 'Error de conexión con el servidor.' };
    }
  },

  async forgotPassword(email: string): Promise<{
    success: boolean;
    message?: string;
    resetToken?: string;
    resetLink?: string;
    code?: string;
    emailSent?: boolean;
    error?: string;
    blocked?: boolean;
  }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        return {
          success: true,
          message: data.message,
          resetToken: data.resetToken,
          resetLink: data.resetLink,
          code: data.code,
          emailSent: data.emailSent,
        };
      }
      return { success: false, error: data.error || 'Error al solicitar enlace.', blocked: !!data.blocked };
    } catch {
      return { success: false, error: 'Error de red al conectar con el servidor.' };
    }
  },

  async resetPassword(resetData: {
    email: string;
    token?: string;
    code?: string;
    newPassword: string;
  }): Promise<{ success: boolean; message?: string; error?: string; blocked?: boolean }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetData),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Error al restablecer contraseña.', blocked: !!data.blocked };
    } catch {
      return { success: false, error: 'Error de red al conectar con el servidor.' };
    }
  },

  async updateProfile(profileData: {
    name?: string;
    phone?: string;
    defaultAddress?: string;
  }): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(profileData),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        if (data.token) setAuthToken(data.token);
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error || 'Error al actualizar perfil.' };
    } catch {
      return { success: false, error: 'Error de conexión al actualizar perfil.' };
    }
  },

  async getMe(): Promise<AppUser | null> {
    try {
      const token = getAuthToken();
      if (!token) return null;
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        return data.user;
      }
    } catch {
      // offline/expired
    }
    return null;
  },

  logout() {
    setAuthToken(null);
  },

  getAuthToken(): string | null {
    return getAuthToken();
  },

  async getUsers(role: string = 'admin'): Promise<AppUser[]> {
    try {
      const res = await fetch(`${BASE_URL}/auth/users`, {
        headers: getHeaders(role),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }
    return [];
  },

  async createUser(userData: any, role: string = 'admin'): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/users`, {
        method: 'POST',
        headers: getHeaders(role),
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, user: data };
      }
      return { success: false, error: data.error || 'Error al crear usuario.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  async updateUser(id: string, userData: any, role: string = 'admin'): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(role),
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true, user: data };
      }
      return { success: false, error: data.error || 'Error al actualizar usuario.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error de conexión.' };
    }
  },

  async deleteUser(id: string, role: string = 'admin'): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/auth/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders(role),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
