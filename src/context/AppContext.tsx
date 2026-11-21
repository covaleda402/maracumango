import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Order,
  CartItem,
  BusinessConfig,
  UserRole,
  OrderStatus,
  CategoryItem,
  Sede,
  AppUser,
  PaymentMethod,
} from '../types';
import { apiService, getAuthToken } from '../services/apiService';
import { storageService, INITIAL_CATEGORIES } from '../services/storageService';
import { SEDES, getSedeById } from '../data/sedes';
import { PRODUCT_INGREDIENTS } from '../data/mockData';

interface AppContextType {
  currentUser: AppUser | null;
  authToken: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCustomer: (customerData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    defaultAddress?: string;
    acceptedTerms: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  updateCustomerProfile: (profileData: {
    name?: string;
    phone?: string;
    defaultAddress?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  staffUsers: AppUser[];
  loadStaffUsers: () => Promise<void>;
  createStaffUser: (userData: any) => Promise<{ success: boolean; error?: string }>;
  updateStaffUser: (id: string, userData: any) => Promise<{ success: boolean; error?: string }>;
  deleteStaffUser: (id: string) => Promise<boolean>;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  products: Product[];
  orders: Order[];
  cart: CartItem[];
  config: BusinessConfig;
  categories: CategoryItem[];
  sedes: Sede[];
  addBranch: (branchData: {
    nombre: string;
    direccion: string;
    ciudad?: string;
    whatsapp: string;
    phone?: string;
    horario?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  deleteBranch: (id: string) => Promise<{ success: boolean; error?: string }>;
  selectedSedeId: string;
  setSelectedSedeId: (sedeId: string) => void;
  workerSedeId: string;
  setWorkerSedeId: (sedeId: string) => void;
  adminSedeId: string;
  setAdminSedeId: (sedeId: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
  isTermsModalOpen: boolean;
  setIsTermsModalOpen: (open: boolean) => void;
  isDbConnected: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, delta: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotal: (deliveryMethod: 'domicilio' | 'recoger') => number;
  createOrder: (orderData: {
    customerName: string;
    customerPhone: string;
    sedeId?: string;
    deliveryMethod: 'domicilio' | 'recoger';
    deliveryAddress?: string;
    deliveryFee?: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => Promise<Order>;
  acceptOrder: (orderId: string) => Promise<boolean>;
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>;
  startPreparation: (orderId: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  downloadSalesReport: (branchId?: string) => Promise<boolean>;
  downloadSalesReportCsv: (branchId?: string) => Promise<boolean>;
  downloadSalesReportExcel: (branchId?: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  toggleProductActive: (productId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<{ success: boolean; deleted?: boolean; message?: string }>;
  addCategory: (categoryData: Omit<CategoryItem, 'id'>) => Promise<void>;
  updateCategory: (category: CategoryItem) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateConfig: (newConfig: Partial<BusinessConfig>) => Promise<void>;
  updateSede: (sedeId: string, sedeData: Partial<Sede>) => Promise<void>;
  reloadAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(getAuthToken());
  const [staffUsers, setStaffUsers] = useState<AppUser[]>([]);
  const [userRole, setUserRoleState] = useState<UserRole>('customer');
  const [activeTab, setActiveTab] = useState<string>('inicio');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<BusinessConfig>(storageService.getConfig());
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [sedes, setSedes] = useState<Sede[]>(SEDES);
  const [selectedSedeId, setSelectedSedeId] = useState<string>('sede-1');
  const [workerSedeId, setWorkerSedeId] = useState<string>('sede-1');
  const [adminSedeId, setAdminSedeId] = useState<string>('all');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const user = await apiService.getMe();
          if (user) {
            setCurrentUser(user);
            if (user.role === 'ADMIN') {
              setUserRoleState('admin');
            } else if (user.role === 'WORKER') {
              setUserRoleState('worker');
              if (user.branchId) {
                setWorkerSedeId(user.branchId);
              }
            } else {
              setUserRoleState('customer');
            }
          } else {
            apiService.logout();
            setAuthTokenState(null);
          }
        }
      } catch {
        // ignore
      }
    };
    initAuth();
  }, []);

  const reloadAllData = async () => {
    try {
      const health = await apiService.checkHealth();
      setIsDbConnected(health.connected);

      const [loadedProducts, loadedOrders, loadedConfig, loadedCats, loadedSedes] = await Promise.all([
        apiService.getProducts(),
        apiService.getAuthToken() ? apiService.getOrders(userRole, userRole === 'worker' ? workerSedeId : adminSedeId) : Promise.resolve([]),
        apiService.getSettings(),
        apiService.getCategories(),
        apiService.getBranches(),
      ]);

      setProducts(loadedProducts);
      setOrders(loadedOrders);
      setConfig(loadedConfig);
      if (loadedCats && loadedCats.length > 0) setCategories(loadedCats);
      if (loadedSedes && loadedSedes.length > 0) {
        const sanitizedSedes = loadedSedes.filter(
          (s) => !s.nombre.toLowerCase().includes('covaleda') && s.id !== 'sede-1795151700722'
        );
        setSedes(sanitizedSedes.length > 0 ? sanitizedSedes : SEDES);
      }
    } catch (e) {
      console.warn('Error reloading data from API:', e);
    }
  };

  useEffect(() => {
    reloadAllData();
  }, [userRole, workerSedeId, adminSedeId]);

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
    if (role === 'worker') {
      setActiveTab('pedidos-trabajador');
    } else if (role === 'admin') {
      setActiveTab('dashboard-admin');
    } else {
      setActiveTab('inicio');
    }
  };

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    // No abrimos el carrito automáticamente para no interrumpir la navegación del cliente
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartTotal = (deliveryMethod: 'domicilio' | 'recoger') => {
    const fee = deliveryMethod === 'domicilio' ? config.defaultDeliveryFee : 0;
    return cartSubtotal + fee;
  };

  const createOrder = async (orderData: {
    customerName: string;
    customerPhone: string;
    sedeId?: string;
    deliveryMethod: 'domicilio' | 'recoger';
    deliveryAddress?: string;
    deliveryFee?: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): Promise<Order> => {
    const targetSedeId = orderData.sedeId || selectedSedeId || 'sede-1';
    const sede = sedes.find((s) => s.id === targetSedeId) || getSedeById(targetSedeId);

    const items = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      unitPrice: item.product.price,
      quantity: item.quantity,
      ingredients: item.product.ingredients || PRODUCT_INGREDIENTS[item.product.id] || ['Ingredientes de la casa'],
      notes: item.notes,
    }));

    const orderPayload = {
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      sedeId: targetSedeId,
      deliveryMethod: orderData.deliveryMethod,
      deliveryAddress: orderData.deliveryAddress,
      deliveryFee: orderData.deliveryFee || 0,
      paymentMethod: orderData.paymentMethod,
      notes: orderData.notes,
      items,
    };

    const createdOrder = await apiService.createOrder(orderPayload);
    if (!createdOrder.sedeNombre) {
      createdOrder.sedeNombre = sede.nombre;
    }

    clearCart();
    await reloadAllData();
    return createdOrder;
  };

  // ADMIN CONFIRMATION ACTION:
  // Admin reviews the order and confirms it. Only after this does it reach workers!
  const acceptOrder = async (orderId: string): Promise<boolean> => {
    const ok = await apiService.acceptOrder(orderId, 'admin');
    await reloadAllData();
    return ok;
  };

  // ADMIN / WORKER CANCELLATION ACTION:
  // Cancels the order, retains it for audit in DB, excludes it from active pipelines & financials
  const cancelOrder = async (orderId: string, reason?: string): Promise<boolean> => {
    const ok = await apiService.cancelOrder(orderId, reason, userRole);
    await reloadAllData();
    return ok;
  };

  const startPreparation = async (orderId: string) => {
    const res = await apiService.startPreparation(orderId, userRole, workerSedeId);
    await reloadAllData();
    return res;
  };

  const downloadSalesReport = async (branchId?: string) => {
    return await apiService.downloadSalesReportExcel(branchId || adminSedeId);
  };

  const downloadSalesReportCsv = async (branchId?: string) => {
    return await apiService.downloadSalesReportCsv(branchId || adminSedeId);
  };

  const downloadSalesReportExcel = async (branchId?: string) => {
    return await apiService.downloadSalesReportExcel(branchId || adminSedeId);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await apiService.updateOrderStatus(orderId, status, userRole, workerSedeId);
    await reloadAllData();
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    await apiService.createProduct(productData, 'admin');
    await reloadAllData();
  };

  const updateProduct = async (product: Product) => {
    await apiService.updateProduct(product.id, product, 'admin');
    await reloadAllData();
  };

  const toggleProductActive = async (productId: string) => {
    await apiService.toggleProductActive(productId, 'admin');
    await reloadAllData();
  };

  const deleteProduct = async (productId: string) => {
    const res = await apiService.deleteProduct(productId, 'admin');
    await reloadAllData();
    return res;
  };

  const addCategory = async (categoryData: Omit<CategoryItem, 'id'>) => {
    await apiService.createCategory(categoryData, 'admin');
    await reloadAllData();
  };

  const updateCategory = async (category: CategoryItem) => {
    await apiService.updateCategory(category.id, category, 'admin');
    await reloadAllData();
  };

  const deleteCategory = async (categoryId: string) => {
    await apiService.deleteCategory(categoryId, 'admin');
    await reloadAllData();
  };

  const updateConfig = async (newConfig: Partial<BusinessConfig>) => {
    await apiService.updateSettings(newConfig, 'admin');
    await reloadAllData();
  };

  const updateSede = async (sedeId: string, sedeData: Partial<Sede>) => {
    await apiService.updateBranch(sedeId, sedeData, 'admin');
    await reloadAllData();
  };

  const addBranch = async (branchData: {
    nombre: string;
    direccion: string;
    ciudad?: string;
    whatsapp: string;
    phone?: string;
    horario?: string;
  }) => {
    const res = await apiService.createBranch(branchData, userRole);
    if (res.success) {
      await reloadAllData();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const deleteBranch = async (id: string) => {
    const res = await apiService.deleteBranch(id, userRole);
    if (res.success) {
      setSedes((prev) => prev.filter((s) => s.id !== id));
      if (selectedSedeId === id || selectedSedeId === 'sede-1795151700722') {
        setSelectedSedeId('sede-1');
      }
      if (workerSedeId === id || workerSedeId === 'sede-1795151700722') {
        setWorkerSedeId('sede-1');
      }
      await reloadAllData();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const login = async (email: string, password: string) => {
    const res = await apiService.login(email, password);
    if (res.success && res.user && res.token) {
      setAuthTokenState(res.token);
      setCurrentUser(res.user);
      if (res.user.role === 'ADMIN') {
        setUserRoleState('admin');
        setActiveTab('dashboard-admin');
      } else if (res.user.role === 'WORKER') {
        setUserRoleState('worker');
        if (res.user.branchId) {
          setWorkerSedeId(res.user.branchId);
        }
        setActiveTab('pedidos-trabajador');
      } else {
        setUserRoleState('customer');
        setActiveTab('inicio');
      }
      await reloadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Credenciales incorrectas' };
  };

  const registerCustomer = async (customerData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    defaultAddress?: string;
    acceptedTerms: boolean;
  }) => {
    const res = await apiService.registerCustomer(customerData);
    if (res.success && res.user && res.token) {
      setAuthTokenState(res.token);
      setCurrentUser(res.user);
      setUserRoleState('customer');
      setActiveTab('inicio');
      await reloadAllData();
      return { success: true };
    }
    return { success: false, error: res.error || 'Error al registrar cliente.' };
  };

  const updateCustomerProfile = async (profileData: {
    name?: string;
    phone?: string;
    defaultAddress?: string;
  }) => {
    const res = await apiService.updateProfile(profileData);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Error al actualizar perfil.' };
  };

  const logout = () => {
    apiService.logout();
    setAuthTokenState(null);
    setCurrentUser(null);
    setUserRoleState('customer');
    setActiveTab('inicio');
    reloadAllData();
  };

  const loadStaffUsers = async () => {
    try {
      const users = await apiService.getUsers(userRole);
      setStaffUsers(users);
    } catch {
      // ignore
    }
  };

  const createStaffUser = async (userData: any) => {
    const res = await apiService.createUser(userData, userRole);
    if (res.success) {
      await loadStaffUsers();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const updateStaffUser = async (id: string, userData: any) => {
    const res = await apiService.updateUser(id, userData, userRole);
    if (res.success) {
      await loadStaffUsers();
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const deleteStaffUser = async (id: string) => {
    const ok = await apiService.deleteUser(id, userRole);
    if (ok) {
      await loadStaffUsers();
      return true;
    }
    return false;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        authToken,
        login,
        registerCustomer,
        updateCustomerProfile,
        logout,
        staffUsers,
        loadStaffUsers,
        createStaffUser,
        updateStaffUser,
        deleteStaffUser,
        userRole,
        setUserRole,
        activeTab,
        setActiveTab,
        products,
        orders,
        cart,
        config,
        categories,
        sedes,
        addBranch,
        deleteBranch,
        selectedSedeId,
        setSelectedSedeId,
        workerSedeId,
        setWorkerSedeId,
        adminSedeId,
        setAdminSedeId,
        isCartOpen,
        setIsCartOpen,
        isRoleModalOpen,
        setIsRoleModalOpen,
        isTermsModalOpen,
        setIsTermsModalOpen,
        isDbConnected,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartTotal,
        createOrder,
        acceptOrder,
        cancelOrder,
        startPreparation,
        downloadSalesReport,
        downloadSalesReportCsv,
        downloadSalesReportExcel,
        updateOrderStatus,
        addProduct,
        updateProduct,
        toggleProductActive,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        updateConfig,
        updateSede,
        reloadAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
