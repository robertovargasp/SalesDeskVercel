# Base de Datos — SalesDesk (Supabase / PostgreSQL)

> Scripts SQL completos en: `c:\SalesDesk\supabase.md`

## Tablas

| Tabla | Descripción |
|---|---|
| `profiles` | Usuarios (vendedores, repartidores, admin) — extiende `auth.users` |
| `products` | Catálogo de productos |
| `cities` | Ciudades disponibles |
| `inventory_items` | Stock actual por vendedor + producto |
| `inventory_assignments` | Solicitudes de carga de mercancía |
| `orders` | Pedidos/ventas |
| `order_items` | Líneas de cada pedido |
| `order_events` | Historial de estados de cada pedido |
| `kardex_entries` | Auditoría de movimientos de inventario |
| `settlements` | Liquidaciones de depósitos |
| `app_config` | Configuración global (ej. datos bancarios) |
| `notifications` | Notificaciones por usuario |

## Mapeo TypeScript → PostgreSQL

| TypeScript (camelCase) | PostgreSQL (snake_case) |
|---|---|
| `sellerId` | `seller_id` |
| `productId` | `product_id` |
| `deliveryPersonId` | `delivery_person_id` |
| `totalVenta` | `total_venta` |
| `totalComision` | `total_comision` |
| `totalDeposito` | `total_deposito` |
| `isActive` | `is_active` |
| `createdAt` | `created_at` |
| `weekRange` | `week_range` |
| `proofUrl` | `proof_url` |
| `settlementFrequency` | `settlement_frequency` |
| `settlementStartDay` | `settlement_start_day` |
| `defaultCommission` | `default_commission` |
| `minStock` | `min_stock` |
| `balanceBefore` | `balance_before` |
| `balanceAfter` | `balance_after` |

El mapeo se realiza en `src/lib/supabase/mappers.ts`.

## Buckets de Storage

```
salesdesk/           (bucket privado)
├── orders/          → fotos de pedidos
├── settlements/     → comprobantes de depósito
└── products/        → imágenes de productos
```

## RLS — Resumen de políticas

| Tabla | Admin | Seller | Delivery |
|---|---|---|---|
| `profiles` | Full | Read all / Update own | Read all |
| `products` | Full | Read | Read |
| `inventory_items` | Full | Own only | — |
| `orders` | Full | Own only | Assigned only |
| `kardex_entries` | Full | Own only | — |
| `settlements` | Full | Own only | — |
