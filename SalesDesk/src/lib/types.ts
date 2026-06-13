
export type UserRole = 'admin' | 'seller' | 'delivery';
export type SettlementFrequency = 'weekly' | 'biweekly';

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  city: string;
  role: UserRole;
  isActive: boolean;
  settlementFrequency: SettlementFrequency;
  settlementStartDay: number;
}

export interface NewUserPayload {
  name: string;
  username: string;
  email?: string;
  city: string;
  phone?: string;
  whatsapp?: string;
  role?: UserRole;
  password: string;
  settlementFrequency?: SettlementFrequency;
  settlementStartDay?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  defaultCommission: number;
  minStock?: number;
  description?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  deliveryPersonId: string;
  quantity: number;
  reservedQuantity: number;
}

export type AssignmentStatus = 'pending' | 'confirmed' | 'disputed' | 'cancelled';
export type MovementType = 'addition' | 'subtraction';
export type MovementReason = 'load' | 'sale' | 'adjustment' | 'return' | 'correction';

export interface InventoryAssignment {
  id: string;
  productId: string;
  deliveryPersonId: string;
  quantity: number;
  type: MovementType;
  reason: MovementReason;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export type SaleStatus =
  | 'assigned'
  | 'accepted'
  | 'contacting'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'delivery_confirmed'  // admin confirmó la entrega reportada por el repartidor
  | 'cancelled'
  | 'paid'
  | 'delivery_failed'
  | 'pending_return';  // pedido fallido esperando decisión (cancelar o reintentar)

export interface SaleEvent {
  date: string;
  type: 'creation' | 'assignment' | 'acceptance' | 'dispatch' | 'delivery' | 'payment' | 'cancel' | 'schedule' | 'failure';
  userId: string | null;
  userName: string;
  note?: string;
}

export interface SaleDetail {
  productId: string;
  quantity: number;
  priceAtSale: number;
  commissionAtSale: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  sellerId: string;
  totalVenta: number;
  totalComision: number;
  totalDeposito: number;
  city: string;
  status: SaleStatus;
  createdAt: string;
  items: SaleDetail[];
  events: SaleEvent[];
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  googleMapsLink?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  notes?: string;
  settlementId?: string;
  photoUrl?: string;
  deliveryPhotoUrl?: string;
  deliveryPersonId?: string;
  failureReason?: string;
  failureStep?: number;
  failedAt?: string;   // timestamptz — cuando pasó a pending_return (para calcular 48h)
}

export interface KardexEntry {
  id: string;
  productId: string;
  sellerId: string;
  deliveryPersonId?: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  userId: string | null;
  userName: string;
  createdAt: string;
  saleId?: string;
  notes?: string;
}

export type SettlementStatus = 'pending' | 'reported' | 'confirmed' | 'rejected';

export interface WeeklySettlement {
  id: string;
  sellerId: string;
  weekRange: string;
  totalVenta: number;
  totalComision: number;
  totalDeposito: number;
  status: SettlementStatus;
  proofUrl?: string;
  reference?: string;
  reportedAt?: string;
  confirmedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}
