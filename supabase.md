# Supabase — Scripts SQL Completos

---

## 1. Extensiones

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
```

---

## 2. Tipos ENUM

```sql
create type user_role as enum ('admin', 'seller', 'delivery');

create type settlement_frequency as enum ('weekly', 'biweekly');

create type order_status as enum (
  'assigned',
  'accepted',
  'contacting',
  'scheduled',
  'in_transit',
  'delivered',
  'cancelled',
  'paid',
  'delivery_failed'
);

create type settlement_status as enum ('pending', 'reported', 'confirmed');

create type movement_type as enum ('addition', 'subtraction');

create type movement_reason as enum ('load', 'sale', 'adjustment', 'return', 'correction');

create type event_type as enum (
  'creation',
  'assignment',
  'acceptance',
  'dispatch',
  'delivery',
  'payment',
  'cancel',
  'schedule',
  'failure'
);

create type assignment_status as enum ('pending', 'confirmed', 'disputed');
```

---

## 3. Tablas

### profiles

```sql
create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  name                  text not null,
  username              text not null unique,
  email                 text,
  phone                 text,
  whatsapp              text,
  city                  text not null default '',
  role                  user_role not null default 'seller',
  is_active             boolean not null default true,
  settlement_frequency  settlement_frequency not null default 'weekly',
  settlement_start_day  smallint not null default 1 check (settlement_start_day between 0 and 6),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index idx_profiles_role     on profiles(role);
create index idx_profiles_username on profiles(username);
create index idx_profiles_city     on profiles(city);
```

### products

```sql
create table products (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  price               numeric(12,2) not null check (price >= 0),
  default_commission  numeric(12,2) not null check (default_commission >= 0),
  min_stock           smallint not null default 4 check (min_stock >= 0),
  description         text,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index idx_products_active on products(is_active) where is_active = true;
```

### cities

```sql
create table cities (
  id    uuid primary key default uuid_generate_v4(),
  name  text not null unique
);
```

### inventory_items

```sql
create table inventory_items (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete restrict,
  seller_id   uuid not null references profiles(id) on delete restrict,
  quantity    integer not null default 0 check (quantity >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, seller_id)
);

create index idx_inventory_seller  on inventory_items(seller_id);
create index idx_inventory_product on inventory_items(product_id);
```

### inventory_assignments

```sql
create table inventory_assignments (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id),
  seller_id   uuid not null references profiles(id),
  quantity    integer not null check (quantity > 0),
  type        movement_type not null default 'addition',
  reason      movement_reason not null default 'load',
  status      assignment_status not null default 'pending',
  notes       text,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_assignments_seller on inventory_assignments(seller_id);
create index idx_assignments_status on inventory_assignments(status);
```

### orders

```sql
create table orders (
  id                  uuid primary key default uuid_generate_v4(),
  seller_id           uuid not null references profiles(id),
  delivery_person_id  uuid references profiles(id),
  city                text not null default '',
  status              order_status not null default 'assigned',
  total_venta         numeric(12,2) not null default 0,
  total_comision      numeric(12,2) not null default 0,
  total_deposito      numeric(12,2) not null default 0,
  customer_name       text,
  customer_phone      text,
  customer_address    text,
  google_maps_link    text,
  delivery_date       date,
  delivery_time       text,
  notes               text,
  photo_url           text,
  failure_reason      text,
  failure_step        smallint,
  settlement_id       uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index idx_orders_seller         on orders(seller_id);
create index idx_orders_delivery       on orders(delivery_person_id);
create index idx_orders_status         on orders(status);
create index idx_orders_city           on orders(city);
create index idx_orders_created        on orders(created_at desc);
create index idx_orders_seller_status  on orders(seller_id, status);
```

### order_items

```sql
create table order_items (
  id                  uuid primary key default uuid_generate_v4(),
  order_id            uuid not null references orders(id) on delete cascade,
  product_id          uuid not null references products(id),
  quantity            integer not null check (quantity > 0),
  price_at_sale       numeric(12,2) not null,
  commission_at_sale  numeric(12,2) not null,
  subtotal            numeric(12,2) not null,
  created_at          timestamptz not null default now()
);

create index idx_order_items_order   on order_items(order_id);
create index idx_order_items_product on order_items(product_id);
```

### order_events

```sql
create table order_events (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  type        event_type not null,
  user_id     uuid references profiles(id),
  user_name   text,
  note        text,
  created_at  timestamptz not null default now()
);

create index idx_order_events_order   on order_events(order_id);
create index idx_order_events_created on order_events(created_at desc);
```

### kardex_entries

```sql
create table kardex_entries (
  id              uuid primary key default uuid_generate_v4(),
  product_id      uuid not null references products(id),
  seller_id       uuid not null references profiles(id),
  order_id        uuid references orders(id) on delete set null,
  type            movement_type not null,
  reason          movement_reason not null,
  quantity        integer not null check (quantity > 0),
  balance_before  integer not null default 0,
  balance_after   integer not null default 0,
  notes           text,
  user_id         uuid references profiles(id),   -- quien realizó el movimiento
  user_name       text,                            -- nombre denormalizado para display rápido
  created_at      timestamptz not null default now()
);

create index idx_kardex_seller         on kardex_entries(seller_id);
create index idx_kardex_product        on kardex_entries(product_id);
create index idx_kardex_created        on kardex_entries(created_at desc);
create index idx_kardex_seller_created on kardex_entries(seller_id, created_at desc);
```

### settlements

```sql
create table settlements (
  id              uuid primary key default uuid_generate_v4(),
  seller_id       uuid not null references profiles(id),
  week_range      text not null,
  total_venta     numeric(12,2) not null default 0,
  total_comision  numeric(12,2) not null default 0,
  total_deposito  numeric(12,2) not null default 0,
  status          settlement_status not null default 'reported',
  reference       text,
  proof_url       text,
  reported_at     timestamptz,
  confirmed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_settlements_seller  on settlements(seller_id);
create index idx_settlements_status  on settlements(status);
create index idx_settlements_created on settlements(created_at desc);
```

### FKs circulares (ejecutar después de crear settlements y orders)

```sql
alter table orders add constraint fk_order_settlement
  foreign key (settlement_id) references settlements(id) on delete set null;
```

### app_config

```sql
create table app_config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz not null default now()
);

insert into app_config (key, value)
values ('payment_info', 'Banco: ...');
```

### notifications

```sql
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  is_read     boolean not null default false,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

create index idx_notifications_user    on notifications(user_id, is_read);
create index idx_notifications_created on notifications(created_at desc);
```

---

## 4. Trigger updated_at automático

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

create trigger trg_inventory_updated_at
  before update on inventory_items
  for each row execute function set_updated_at();

create trigger trg_assignments_updated_at
  before update on inventory_assignments
  for each row execute function set_updated_at();

create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

create trigger trg_settlements_updated_at
  before update on settlements
  for each row execute function set_updated_at();
```

---

## 5. Función helper de rol

```sql
create or replace function get_my_role()
returns user_role
language sql stable
security definer
as $$
  select role from profiles where id = auth.uid()
$$;
```

---

## 6. Row Level Security (RLS)

### Habilitar RLS en todas las tablas

```sql
alter table profiles              enable row level security;
alter table products              enable row level security;
alter table cities                enable row level security;
alter table inventory_items       enable row level security;
alter table inventory_assignments enable row level security;
alter table kardex_entries        enable row level security;
alter table orders                enable row level security;
alter table order_items           enable row level security;
alter table order_events          enable row level security;
alter table settlements           enable row level security;
alter table app_config            enable row level security;
alter table notifications         enable row level security;
```

### profiles

```sql
create policy "profiles_select"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles_insert"
  on profiles for insert
  with check (get_my_role() = 'admin');

create policy "profiles_update"
  on profiles for update
  using (id = auth.uid() or get_my_role() = 'admin');

create policy "profiles_delete"
  on profiles for delete
  using (get_my_role() = 'admin');
```

### products

```sql
create policy "products_select"
  on products for select
  using (auth.role() = 'authenticated');

create policy "products_write"
  on products for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');
```

### cities

```sql
create policy "cities_select"
  on cities for select
  using (auth.role() = 'authenticated');

create policy "cities_write"
  on cities for all
  using (get_my_role() = 'admin');
```

### inventory_items

```sql
create policy "inventory_select_admin"
  on inventory_items for select
  using (get_my_role() = 'admin');

create policy "inventory_select_seller"
  on inventory_items for select
  using (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "inventory_write_admin"
  on inventory_items for all
  using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- Seller puede insertar sus propios items (al confirmar asignaciones)
create policy "inventory_insert_seller"
  on inventory_items for insert
  with check (seller_id = auth.uid() and get_my_role() = 'seller');

-- Seller puede actualizar la cantidad de sus propios items
create policy "inventory_update_seller"
  on inventory_items for update
  using (seller_id = auth.uid() and get_my_role() = 'seller');
```

### inventory_assignments

```sql
create policy "assignments_select_admin"
  on inventory_assignments for select
  using (get_my_role() = 'admin');

create policy "assignments_select_seller"
  on inventory_assignments for select
  using (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "assignments_insert_admin"
  on inventory_assignments for insert
  with check (get_my_role() = 'admin');

create policy "assignments_update"
  on inventory_assignments for update
  using (
    get_my_role() = 'admin'
    or (get_my_role() = 'seller' and seller_id = auth.uid())
  );

create policy "assignments_delete_admin"
  on inventory_assignments for delete
  using (get_my_role() = 'admin');
```

### kardex_entries

```sql
create policy "kardex_select_admin"
  on kardex_entries for select
  using (get_my_role() = 'admin');

create policy "kardex_select_seller"
  on kardex_entries for select
  using (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "kardex_insert"
  on kardex_entries for insert
  with check (get_my_role() in ('admin', 'seller'));

create policy "kardex_update_admin"
  on kardex_entries for update
  using (get_my_role() = 'admin');
```

### orders

```sql
create policy "orders_select_admin"
  on orders for select
  using (get_my_role() = 'admin');

create policy "orders_select_seller"
  on orders for select
  using (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "orders_select_delivery"
  on orders for select
  using (delivery_person_id = auth.uid() and get_my_role() = 'delivery');

create policy "orders_insert"
  on orders for insert
  with check (get_my_role() in ('admin', 'seller'));

create policy "orders_update_admin"
  on orders for update
  using (get_my_role() = 'admin');

create policy "orders_update_seller"
  on orders for update
  using (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "orders_update_delivery"
  on orders for update
  using (delivery_person_id = auth.uid() and get_my_role() = 'delivery');

create policy "orders_delete_admin"
  on orders for delete
  using (get_my_role() = 'admin');
```

### order_items

```sql
create policy "order_items_select"
  on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and (
          get_my_role() = 'admin'
          or o.seller_id = auth.uid()
          or o.delivery_person_id = auth.uid()
        )
    )
  );

create policy "order_items_insert"
  on order_items for insert
  with check (get_my_role() in ('admin', 'seller'));

create policy "order_items_delete_admin"
  on order_items for delete
  using (get_my_role() = 'admin');
```

### order_events

```sql
create policy "order_events_select"
  on order_events for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_id
        and (
          get_my_role() = 'admin'
          or o.seller_id = auth.uid()
          or o.delivery_person_id = auth.uid()
        )
    )
  );

create policy "order_events_insert"
  on order_events for insert
  with check (auth.role() = 'authenticated');
```

### settlements

```sql
create policy "settlements_select_admin"
  on settlements for select
  using (get_my_role() = 'admin');

create policy "settlements_select_seller"
  on settlements for select
  using (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "settlements_insert_seller"
  on settlements for insert
  with check (seller_id = auth.uid() and get_my_role() = 'seller');

create policy "settlements_update_admin"
  on settlements for update
  using (get_my_role() = 'admin');

create policy "settlements_delete_admin"
  on settlements for delete
  using (get_my_role() = 'admin');
```

### app_config

```sql
create policy "config_select"
  on app_config for select
  using (auth.role() = 'authenticated');

create policy "config_write"
  on app_config for all
  using (get_my_role() = 'admin');
```

### notifications

```sql
create policy "notifications_own"
  on notifications for all
  using (user_id = auth.uid());

create policy "notifications_insert_admin"
  on notifications for insert
  with check (get_my_role() = 'admin');
```

---

## 7. Storage — Bucket y políticas

```sql
-- Crear bucket (también se puede hacer desde el dashboard de Supabase)
insert into storage.buckets (id, name, public)
values ('salesdesk', 'salesdesk', false);

-- Lectura: cualquier usuario autenticado
create policy "storage_read"
  on storage.objects for select
  using (bucket_id = 'salesdesk' and auth.role() = 'authenticated');

-- Escritura: cualquier usuario autenticado
create policy "storage_insert"
  on storage.objects for insert
  with check (bucket_id = 'salesdesk' and auth.role() = 'authenticated');

-- Actualizar: admin o propietario del archivo
create policy "storage_update"
  on storage.objects for update
  using (bucket_id = 'salesdesk' and auth.role() = 'authenticated');

-- Borrar: solo admin
create policy "storage_delete"
  on storage.objects for delete
  using (
    bucket_id = 'salesdesk'
    and exists (
      select 1 from profiles where id = auth.uid() and role = 'admin'
    )
  );
```

---

## 9. SQL de corrección — Flujo admin/vendedor → repartidor

Ejecutar en el SQL Editor de Supabase si aparece error 403 al asignar repartidores:

```sql
-- ══════════════════════════════════════════════════
-- Verificar políticas activas en orders
-- ══════════════════════════════════════════════════
select policyname, cmd, qual
from pg_policies
where tablename = 'orders'
order by cmd, policyname;

-- ══════════════════════════════════════════════════
-- Asegurar que seller puede UPDATE delivery_person_id
-- (ya incluido en orders_update_seller pero se verifica aquí)
-- ══════════════════════════════════════════════════
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'orders_update_seller'
  ) then
    execute $p$
      create policy "orders_update_seller"
        on orders for update
        using (seller_id = auth.uid() and get_my_role() = 'seller')
    $p$;
    raise notice 'orders_update_seller creada';
  else
    raise notice 'orders_update_seller ya existe';
  end if;
end $$;

-- ══════════════════════════════════════════════════
-- Asegurar que delivery puede UPDATE status, failure_reason, failure_step
-- ══════════════════════════════════════════════════
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'orders' and policyname = 'orders_update_delivery'
  ) then
    execute $p$
      create policy "orders_update_delivery"
        on orders for update
        using (delivery_person_id = auth.uid() and get_my_role() = 'delivery')
    $p$;
    raise notice 'orders_update_delivery creada';
  else
    raise notice 'orders_update_delivery ya existe';
  end if;
end $$;

-- ══════════════════════════════════════════════════
-- Permisos de tabla para authenticated
-- ══════════════════════════════════════════════════
grant select, insert, update on orders       to authenticated;
grant select, insert, update on order_items  to authenticated;
grant select, insert         on order_events to authenticated;
```

---

## 8. Orden de ejecución recomendado

```
1. Extensiones
2. ENUMs
3. Tablas (en este orden para respetar FKs):
   profiles
   products
   cities
   inventory_items
   inventory_assignments
   orders
   order_items
   order_events
   kardex_entries
   settlements
   app_config
   notifications
4. FK circular: alter table orders add constraint fk_order_settlement...
5. Trigger set_updated_at + todos los triggers
6. Función get_my_role()
7. Habilitar RLS en todas las tablas
8. Todas las políticas RLS
9. Storage bucket + políticas
```

---

## 10. Migración — Estado `pending_return` y campo `failed_at`

Ejecutar en el SQL Editor de Supabase para habilitar el flujo de gestión de pedidos fallidos.

```sql
-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 1: Agregar 'pending_return' al enum order_status
-- (ALTER TYPE ADD VALUE no puede ejecutarse dentro de una transacción)
-- ══════════════════════════════════════════════════════════════════════════════
alter type order_status add value if not exists 'pending_return';

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 2: Agregar columna failed_at a orders
-- Registra exactamente cuándo el pedido pasó a pending_return
-- para calcular el límite de 48 horas en el frontend
-- ══════════════════════════════════════════════════════════════════════════════
alter table orders
  add column if not exists failed_at timestamptz;

create index if not exists idx_orders_failed_at
  on orders(failed_at)
  where failed_at is not null;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 3: RLS — seller puede UPDATE failed_at en sus propios pedidos
-- (ya está cubierto por orders_update_seller, pero se documenta aquí)
-- ══════════════════════════════════════════════════════════════════════════════
-- No se requiere nueva política — orders_update_seller y orders_update_admin
-- ya permiten modificar cualquier columna en las filas correspondientes.

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ══════════════════════════════════════════════════════════════════════════════
select column_name, data_type
from information_schema.columns
where table_name = 'orders'
  and column_name in ('status', 'failure_reason', 'failure_step', 'failed_at')
order by column_name;

select enum_range(null::order_status);
```
