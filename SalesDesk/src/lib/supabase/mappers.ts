import type {
  UserProfile, Product, InventoryItem, InventoryAssignment,
  Sale, SaleDetail, SaleEvent, WeeklySettlement, KardexEntry
} from '@/lib/types';

export function mapUser(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    city: row.city ?? '',
    role: row.role,
    isActive: row.is_active,
    settlementFrequency: row.settlement_frequency,
    settlementStartDay: row.settlement_start_day,
  };
}

export function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    defaultCommission: Number(row.default_commission),
    minStock: row.min_stock ?? undefined,
    description: row.description ?? undefined,
  };
}

export function mapInventoryItem(row: any): InventoryItem {
  return {
    id: row.id,
    productId: row.product_id,
    sellerId: row.seller_id,
    quantity: row.quantity,
  };
}

export function mapAssignment(row: any): InventoryAssignment {
  return {
    id: row.id,
    productId: row.product_id,
    sellerId: row.seller_id,
    quantity: row.quantity,
    type: row.type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    notes: row.notes ?? undefined,
  };
}

function mapOrderItem(row: any): SaleDetail {
  return {
    productId: row.product_id,
    quantity: row.quantity,
    priceAtSale: Number(row.price_at_sale),
    commissionAtSale: Number(row.commission_at_sale),
    subtotal: Number(row.subtotal),
  };
}

function mapOrderEvent(row: any): SaleEvent {
  return {
    date: row.created_at,
    type: row.type,
    userId: row.user_id ?? '',
    userName: row.user_name ?? '',
    note: row.note ?? undefined,
  };
}

export function mapSale(row: any): Sale {
  return {
    id: row.id,
    sellerId: row.seller_id,
    deliveryPersonId: row.delivery_person_id ?? undefined,
    city: row.city ?? '',
    status: row.status,
    totalVenta: Number(row.total_venta),
    totalComision: Number(row.total_comision),
    totalDeposito: Number(row.total_deposito),
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    customerAddress: row.customer_address ?? undefined,
    googleMapsLink: row.google_maps_link ?? undefined,
    deliveryDate: row.delivery_date ?? undefined,
    deliveryTime: row.delivery_time ?? undefined,
    notes: row.notes ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    deliveryPhotoUrl: row.delivery_photo_url ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    failureStep: row.failure_step ?? undefined,
    failedAt: row.failed_at ?? undefined,
    settlementId: row.settlement_id ?? undefined,
    createdAt: row.created_at,
    items: (row.order_items ?? []).map(mapOrderItem),
    events: (row.order_events ?? []).sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ).map(mapOrderEvent),
  };
}

export function mapSettlement(row: any): WeeklySettlement {
  return {
    id: row.id,
    sellerId: row.seller_id,
    weekRange: row.week_range,
    totalVenta: Number(row.total_venta),
    totalComision: Number(row.total_comision),
    totalDeposito: Number(row.total_deposito),
    status: row.status,
    proofUrl: row.proof_url ?? undefined,
    reference: row.reference ?? undefined,
    reportedAt: row.reported_at ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapKardex(row: any): KardexEntry {
  return {
    id: row.id,
    productId: row.product_id,
    sellerId: row.seller_id,
    type: row.type,
    reason: row.reason,
    quantity: row.quantity,
    balanceBefore: row.balance_before,
    balanceAfter: row.balance_after,
    userId: row.user_id ?? '',
    userName: row.user_name ?? '',
    createdAt: row.created_at,
    saleId: row.order_id ?? undefined,
    notes: row.notes ?? undefined,
  };
}
