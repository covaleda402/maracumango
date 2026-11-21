export type Category = 'Granizados' | 'Micheladas' | 'Helados' | string;

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  order?: number;
}

export interface ShiftItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
  isActive?: boolean;
}

export interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  whatsapp: string;
  phone?: string;
  horario: string;
  shiftInfo: string;
  activa?: boolean;
  shifts?: ShiftItem[];
}

export type UserRole = 'customer' | 'worker' | 'admin';

export type DeliveryMethod = 'domicilio' | 'recoger';

export type PaymentMethod = 'nequi' | 'bancolombia' | 'transferencia' | 'efectivo';

export type OrderStatus =
  | 'Pendiente'
  | 'En preparación'
  | 'Listo'
  | 'Entregado'
  | 'Cancelado'
  | 'PENDING_ADMIN'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  categoryId?: string;
  price: number;
  description: string;
  image: string;
  active: boolean;
  popular?: boolean;
  ingredients?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal?: number;
  ingredients?: string[];
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  customerEmail?: string;
  sedeId: string;
  sedeNombre?: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  statusLabel?: string;
  createdAt: string;
  notes?: string;
  acceptedBy?: string;
  acceptedAt?: string;
  preparedBy?: string;
  preparedByName?: string;
  preparedAt?: string;
}

export interface BusinessConfig {
  whatsappNumber: string;
  sede1Whatsapp?: string;
  sede2Whatsapp?: string;
  defaultDeliveryFee: number;
  businessName: string;
  mainAddress: string;
  city: string;
  shiftInfo: string;
  logoUrl?: string;
}

export interface AppUser {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  defaultAddress?: string;
  role: 'ADMIN' | 'WORKER' | 'CUSTOMER';
  branchId?: string | null;
  branchName?: string;
  acceptedTerms?: boolean;
  active?: boolean;
}
