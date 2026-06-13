# SalesDesk — Manual de Interfaz de Usuario

---

## 1. Diseño Visual

### 1.1 Colores (Variables CSS — Modo Claro)

El sistema de colores usa propiedades CSS con valores HSL definidos en `src/app/globals.css`.

| Variable | Valor HSL | Uso principal |
|----------|-----------|---------------|
| `--background` | `210 40% 98%` | Fondo general de la app (blanco azulado muy claro) |
| `--foreground` | `222.2 84% 4.9%` | Texto principal (azul muy oscuro / casi negro) |
| `--primary` | `222.2 47.4% 11.2%` | Color de marca — botones primarios, nav activa (navy oscuro) |
| `--primary-foreground` | `210 40% 98%` | Texto sobre elementos primarios (blanco) |
| `--secondary` | `210 40% 96.1%` | Fondo de elementos secundarios |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | Texto sobre secondary |
| `--muted` | `210 40% 96.1%` | Fondo de badges neutros, elementos desactivados |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Texto de ayuda, etiquetas, placeholders |
| `--accent` | `210 40% 96.1%` | Hover en items de navegación |
| `--accent-foreground` | `222.2 47.4% 11.2%` | Texto sobre accent |
| `--destructive` | `0 84.2% 60.2%` | Acciones destructivas, errores (rojo) |
| `--border` | `214.3 31.8% 91.4%` | Bordes de tarjetas, dividers |
| `--input` | `214.3 31.8% 91.4%` | Borde de campos de formulario |
| `--ring` | `222.2 84% 4.9%` | Anillo de foco en inputs |
| `--radius` | `0.75rem` | Radio de borde (12 px) |

**Variables de Sidebar:**

| Variable | Valor HSL |
|----------|-----------|
| `--sidebar-background` | `222.2 47.4% 11.2%` (navy) |
| `--sidebar-foreground` | `210 40% 98%` (blanco) |
| `--sidebar-primary` | `210 40% 98%` |
| `--sidebar-accent` | `223.8 38.4% 18.9%` (navy ligeramente más claro para hover) |
| `--sidebar-border` | `223.8 38.4% 18.9%` |

### 1.2 Colores de Estado (Tailwind Utilities)

Estos colores aparecen como `className` en badges y alertas — no usan variables CSS sino clases utilitarias de Tailwind.

#### Estados de Pedido (SaleStatus)

| Status (código) | Etiqueta visible | Clase de fondo | Clase de texto |
|-----------------|------------------|----------------|----------------|
| `assigned` | Por Aceptar (admin) / En Ruta (sales) | `bg-muted` | `text-muted-foreground` |
| `accepted` | Confirmada | `bg-blue-100` | `text-blue-700` |
| `contacting` | En Contacto | `bg-indigo-100` | `text-indigo-700` |
| `scheduled` | Agendado | `bg-purple-100` | `text-purple-700` |
| `in_transit` | En Camino | `bg-blue-100` / `bg-orange-100` | `text-blue-700` / `text-orange-700` |
| `delivered` | Entregado | `bg-green-100` | `text-green-700` |
| `delivery_confirmed` | Entregado | `bg-green-100` | `text-green-700` |
| `paid` | Liquidado | `bg-emerald-100` / `bg-primary/10` | `text-emerald-700` / `text-primary` |
| `cancelled` | Cancelado | `bg-red-100` | `text-red-600` |
| `delivery_failed` | Fallido | `bg-red-100` | `text-red-800` |
| `pending_return` | Devolución | `bg-orange-100` | `text-orange-700` |

> Nota: Las páginas de Admin Sales y Admin Delivery usan esquemas de colores ligeramente distintos para los mismos estados.

#### Estados de Liquidación (SettlementStatus)

| Status (código) | Etiqueta visible | Clase de fondo | Clase de texto |
|-----------------|------------------|----------------|----------------|
| `pending` | — (oculto en UI del repartidor) | — | — |
| `reported` | Por Validar | `bg-orange-100` | `text-orange-700` |
| `confirmed` | Confirmado | `bg-green-100` | `text-green-700` / `text-green-800` |
| `rejected` | Rechazado | `bg-red-100` | `text-red-700` |

#### Movimientos de Inventario (Kardex)

| Tipo | Etiqueta | Clase de fondo | Clase de texto |
|------|----------|----------------|----------------|
| `addition` | (Motivo en español) | `bg-green-100` | `text-green-800` |
| `subtraction` | (Motivo en español) | `bg-red-100` | `text-red-800` |

Motivos en español: Carga / Venta / Ajuste / Devolución / Corrección

#### Indicadores de Stock

| Condición | Color del valor |
|-----------|----------------|
| `available === 0` | `text-muted-foreground/30` (muy gris) |
| `available < minStock` (stock bajo) | `text-orange-500` |
| Stock normal | `text-green-600` |

Badge de stock bajo: `bg-orange-100 text-orange-700`

### 1.3 Tipografía

- **Fuente de encabezados**: clase `font-headline` (variable `--font-headline` — Google Fonts, Geist o similar)
- **Tamaños de títulos de módulo**: `text-2xl font-bold font-headline`
- **Subtítulos de sección**: `text-sm font-bold uppercase text-muted-foreground`
- **Labels de formulario**: `text-[10px] font-black uppercase text-muted-foreground` (etiquetas de KPI / encabezados de tabla)
- **Valores numéricos grandes (KPI)**: `text-4xl font-black` (métricas en tarjetas de resumen)
- **Texto de tabla**: `text-xs` para la mayoría de celdas; `text-sm font-bold` para nombres de productos/clientes
- **Importes grandes en stock**: `text-2xl font-black`

### 1.4 Sombras y Bordes

- Las `Card` usan `border-none shadow-sm` por defecto (sin borde visible, sombra suave)
- Las tarjetas de alerta tienen `border-l-4 border-orange-200 bg-orange-50` (raya izquierda naranja)
- Los campos del formulario tienen `border border-input` con `rounded-md`

---

## 2. Layout y Navegación

### 2.1 Estructura General

```
┌────────────────────────────────────────────────────────────────┐
│  [Desktop]                                                     │
│  ┌──────────────┐  ┌──────────────────────────────────────┐    │
│  │  Sidebar     │  │  Área de contenido principal         │    │
│  │  w-64        │  │  p-4 md:p-6 lg:p-8                   │    │
│  │  navy fijo   │  │  bg-background                       │    │
│  │              │  │                                      │    │
│  └──────────────┘  └──────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  [Mobile]                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Header sticky — hamburger (Sheet) + logo/nombre usuario │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Área de contenido principal (scroll vertical)           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Sidebar (Desktop)

- Fondo: navy (`--sidebar-background`)
- Texto: blanco (`--sidebar-foreground`)
- Ancho fijo: `w-64`
- Cabecera del sidebar: logo + nombre de la app
- Bloque de usuario: avatar con inicial, nombre de usuario, badge de rol
- Links de navegación: icono + etiqueta de texto
- **Link activo**: `bg-primary text-primary-foreground` (blanco sobre navy más oscuro / blanco sobre tono diferente)
- **Link inactivo (hover)**: `hover:bg-sidebar-accent`
- Botón de Cerrar Sesión al fondo del sidebar: icono LogOut + texto "Cerrar Sesión", texto rojo en hover

### 2.3 Header Mobile

- `sticky top-0 z-30 bg-background/95 backdrop-blur`
- Botón hamburger izquierda: abre un `Sheet` de shadcn/ui con el mismo contenido que el sidebar desktop
- El Sheet se cierra al hacer click en cualquier link de navegación

### 2.4 Estados de Carga y Error

- **Cargando (auth/profile)**: muestra esqueletos (`Skeleton`) que imitan la estructura de la página (sidebar + contenido)
- **Error de perfil**: pantalla completa con mensaje "Error de Perfil — No se pudo cargar tu información de usuario. Por favor, contacta al administrador." con botón "Cerrar Sesión"
- **Sin datos**: cada sección muestra un estado vacío con icono grande en círculo gris + texto en cursiva (ej. "Sin stock asignado actualmente.")

### 2.5 Menú de Navegación por Rol

#### Admin
| Icono | Etiqueta | Ruta |
|-------|----------|------|
| LayoutDashboard | Dashboard | `/dashboard` |
| Package | Productos | `/dashboard/admin/products` |
| Users | Usuarios | `/dashboard/admin/sellers` |
| Warehouse | Inventario | `/dashboard/admin/inventory` |
| ShoppingCart | Ventas | `/dashboard/admin/sales` |
| Truck | Paquetería | `/dashboard/admin/delivery` |
| Banknote | Liquidaciones | `/dashboard/admin/settlements` |
| Sparkles | AI Insights | `/dashboard/admin/insights` |

#### Vendedor (Seller)
| Icono | Etiqueta | Ruta |
|-------|----------|------|
| LayoutDashboard | Mi Panel | `/dashboard` |
| Package | Mi Inventario | `/dashboard/seller/inventory` |
| ShoppingCart | Ventas | `/dashboard/seller/sales` |
| Truck | Paquetería | `/dashboard/seller/delivery` |
| Banknote | Mis Reportes | `/dashboard/seller/settlements` |

#### Repartidor (Delivery)
| Icono | Etiqueta | Ruta |
|-------|----------|------|
| Truck | Mis Entregas | `/dashboard/delivery` |
| Package | Mi Inventario | `/dashboard/delivery/inventory` |

---

## 3. Componentes Clave

### 3.1 Tarjetas KPI (Métricas)

Patrón estándar en todos los módulos:

```
┌─────────────────────────────┐
│ ETIQUETA (text-[10px] caps) │
│ $12,345.00 (text-4xl bold)  │
│ subtexto (text-xs muted)    │
└─────────────────────────────┘
```

- Sin borde, sombra suave (`border-none shadow-sm`)
- En grids de 2 o 4 columnas según la sección
- Algunas tarjetas son clickeables (en seller/delivery): aplican un filtro al hacer click; se resaltan con `ring-2 ring-primary`

---

### 3.2 Formulario: Registrar Venta Directa

Disponible para Admin y Vendedor. Se abre como diálogo (`Dialog`) de ancho amplio.

**Título del diálogo:** "Registrar Venta Directa"

**Campos del formulario (en orden):**

| Campo | Tipo UI | Obligatorio | Observaciones |
|-------|---------|-------------|---------------|
| Vendedor Responsable | Select | Sí (solo admin) | Auto-asignado al vendedor |
| Ciudad | Input texto | No | Se auto-rellena al elegir repartidor |
| Repartidor | Select | Sí | Lista de repartidores con inventario |
| Cliente — OBLIGATORIO | Input texto | Sí | Placeholder: "Nombre del cliente" |
| Teléfono | Input texto | Sí | Placeholder: "Número de teléfono" |
| Dirección de Entrega | Input texto | Sí | Placeholder: "Dirección completa" |
| Link Google Maps | Input URL | No | Placeholder: "https://maps.google.com/..." |
| Tabla de productos | Tabla inline | — | Columnas: Producto / Stock Disponible (badge) / Cant. / Precio Unit. |
| Foto Comprobante | Input file | No | Acepta `image/*`; vista previa en miniatura |
| Cobro al Cliente | Input número | Auto | Pre-calculado; editable |
| Comisión Repartidor | Input número | Auto | Pre-calculado; editable |
| A Pagar al Admin | Input número | Auto | Read-only (calculado) |

**Comportamiento de la tabla de productos:**
- Una fila por producto activo del sistema
- Columna "Stock Disponible": número en badge verde si hay suficiente; badge rojo si `<5`
- Columna "Cant.": input numérico; se valida en tiempo real contra el stock disponible del repartidor
- Si la cantidad supera el stock, el input se pone en rojo y aparece el mensaje de error
- Las cantidades vacías (0) no se incluyen en el pedido al guardar

**Botones del diálogo:**
- "Cancelar" (variant=outline): cierra sin guardar
- "Registrar Venta" (variant=default, color primario): guarda; deshabilitado durante la solicitud

---

### 3.3 Formulario: Registrar Usuario

Disponible solo para Admin. Se abre como `Dialog`.

**Título:** "Nuevo Usuario" / "Editar Usuario"

**Campos (en orden):**

| Campo | Tipo UI | Obligatorio | Observaciones |
|-------|---------|-------------|---------------|
| Rol | Select (seller/delivery) | Sí | No editable en modo edición |
| Nombre Completo | Input texto | Sí | |
| Nombre de Usuario | Input texto | Sí | Solo alfanumérico + guión bajo; sin espacios |
| Ciudad | Input texto | Sí | Mínimo 3 caracteres |
| Teléfono | Input texto | No | Solo dígitos; mínimo 10 |
| Email | Input email | No | |
| WhatsApp | Input texto | No | Solo dígitos; mínimo 10 |
| Frecuencia Liquidación | Select (semanal/quincenal) | Solo vendedores | |
| Día de Corte | Select (lun-dom) | Solo vendedores | Día inicial del ciclo |
| Contraseña | Input password | Sí (solo al crear) | Req: 8 chars, mayúsc., minúsc., número, especial |
| Confirmar Contraseña | Input password | Sí (solo al crear) | Debe coincidir |

**Indicador de requisitos de contraseña:** lista de checks con íconos que se activan en verde al cumplir cada criterio en tiempo real.

---

### 3.4 Formulario: Nuevo Producto

Disponible solo para Admin. Se abre como `Dialog`.

**Título:** "Nuevo Producto" / "Editar Producto"

**Campos:**

| Campo | Tipo UI | Obligatorio | Observaciones |
|-------|---------|-------------|---------------|
| Nombre del Producto | Input texto | Sí | |
| Precio de Venta ($) | Input número | Sí | Debe ser > 0 |
| Comisión Base ($) | Input número | No | Por defecto: 200; no puede ser negativo |
| Stock Mínimo | Input número entero | No | Por defecto: 4; no puede ser negativo |
| Descripción | Textarea | No | Opcional |

---

### 3.5 Formulario: Enviar Mercancía (Asignación de Inventario)

Disponible solo para Admin. Aparece como panel lateral o sección inline en la página de Inventario.

**Campos:**

| Campo | Tipo UI | Obligatorio |
|-------|---------|-------------|
| Responsable de Recepción | Select (repartidores) | Sí |
| Cantidad por Producto (una fila por producto) | Input número | Al menos 1 >0 |

**Botón:** "Enviar Mercancía" — color primario.

---

### 3.6 Formulario: Ajuste Manual de Inventario

Disponible solo para Admin. Se abre como `Dialog`.

**Campos:**

| Campo | Tipo UI | Obligatorio |
|-------|---------|-------------|
| Repartidor | Select | Sí |
| Producto | Select | Sí |
| Tipo de ajuste | Radio (Sumar Stock / Restar Stock) | Sí |
| Cantidad | Input número | Sí, >0 |

---

### 3.7 Formulario: Enviar Liquidación (Repartidor)

Parte de la sub-pestaña "Liquidar" en `/dashboard/delivery`.

**Estructura:**

1. **Resumen de balance** (3 métricas):
   - Total cobrado
   - Mi comisión
   - A depositar

2. **Lista de pedidos seleccionables:**
   - Checkbox por pedido
   - Por pedido: ID corto + nombre cliente + monto + fecha

3. **Campos de envío:**

| Campo | Tipo UI | Obligatorio | Observaciones |
|-------|---------|-------------|---------------|
| Monto a depositar | Input número | Sí | Pre-calculado; editable |
| Referencia / Folio de depósito | Input texto | Sí | "Número de transacción o referencia" |
| Foto del comprobante | Input file (`image/*`) | Sí | Labeled "Foto obligatoria"; opción de captura con cámara |

**Botón:** "Enviar al Admin" — verde (`bg-green-600`); deshabilitado si faltan campos requeridos.

4. **Historial de liquidaciones pasadas** debajo del formulario:
   - Lista de liquidaciones anteriores con badge de estado, período, fecha, monto

---

### 3.8 Formulario: Agendar Entrega (Vendedor / Repartidor)

Se abre como `Dialog`.

**Título:** "Agendar Entrega"

**Campos:**

| Campo | Tipo UI | Obligatorio |
|-------|---------|-------------|
| Fecha de entrega | `Calendar` (dual-month, shadcn/ui) | Sí |
| Hora acordada | Input texto | No (ej. "3:30 PM") |

**Botón:** "Confirmar Agenda"

---

### 3.9 Formulario: Confirmar Entrega (Repartidor)

Se abre como `Dialog` al presionar "Marcar como Entregado".

**Título:** "Confirmar estado de entrega"

**Opciones (radio/botón seleccionable):**
- Entregado
- No lo quiere
- Rechazado
- Reportar problema

**Campo adicional:** Comentario (textarea opcional)

**Botón:** "Confirmar" — deshabilitado hasta seleccionar una opción.

---

### 3.10 Formulario: Reportar Fallo en Entrega (Repartidor)

Se abre como `Dialog`.

**Título:** "Reportar Fallo en Entrega"

**Opciones predefinidas (radio):**
1. Cliente no estaba en casa
2. Cliente no contestó
3. Dirección incorrecta
4. Cliente canceló
5. Zona de riesgo
6. Problema de vehículo
7. Otro (activa campo de texto libre)

**Botón:** "Confirmar Fallo" — deshabilitado hasta seleccionar opción.

---

### 3.11 Formulario: Rechazar Venta (Vendedor)

Se abre como `Dialog`.

**Título:** "Rechazar esta venta"

| Campo | Tipo UI | Obligatorio |
|-------|---------|-------------|
| Motivo del Rechazo | Textarea | Sí |

**Botón:** "Confirmar Rechazo" (rojo destructive) — deshabilitado si el motivo está vacío.

---

### 3.12 Tabla: Lista de Ventas — Admin (Ventas y Cobranza)

Dentro del acordeón de cada vendedor:

| Columna | Contenido |
|---------|-----------|
| Fecha | Formato `dd/MM/yy` |
| Cliente | Nombre del cliente (muestra `**********` si status=`assigned`) |
| Cuentas ($) | Monto cobrado + monto "A Liquidar" |
| Rastreador Logístico | Timeline de iconos circulares mostrando el progreso |
| Repartidor | Nombre del repartidor asignado (o "—") |
| Acción | Botón contextual según estado (Asignar/Reasignar/Ver/Eliminar) |

**Stepper de estado (Rastreador Logístico):**
Secuencia de 5 pasos con íconos circulares: Aceptar (Handshake) → Contactar (Phone) → Agendar (CalendarDays) → En Ruta (Truck) → Entregado (Package). Los pasos completados se muestran sólidos; el paso actual pulsa o está resaltado; los pendientes están en muted.

---

### 3.13 Tabla: Lista de Ventas — Vendedor (Mis Ventas)

Vista de tarjetas en cuadrícula (grid 1-2-3 columnas según pantalla):

**Cada tarjeta muestra:**
- ID de venta (truncado + botón copiar)
- Fecha y hora (`dd MMM yyyy HH:mm`)
- Badge de estado (color según tabla de estados)
- Nombre del cliente
- Nombre del repartidor asignado (o "Sin asignar")
- Total de la venta (`$X,XXX`)
- Indicador de ciudad

**Vista de detalle (al hacer click en tarjeta):** panel completo con:

1. **Stepper de progreso** (5 pasos): barra de porcentaje (0%, 20%, 40%, 60%, 80%, 100%) + íconos de paso
2. **Datos del cliente** (ocultos hasta `accepted`): nombre, teléfono (con botón copiar), dirección (con botón copiar), link Google Maps (si existe)
3. **Foto de referencia** (miniatura clickeable para ampliar)
4. **Tabla de productos del pedido**: Producto / Cantidad / Precio Unit. / Subtotal
5. **Resumen financiero** (3 tarjetas): Cobro al Cliente / Comisión Repartidor / A Pagar al Admin
6. **Información de entrega**: fecha agendada, hora, notas
7. **Timeline de eventos** del pedido (acordeón): cada evento con fecha + descripción

---

### 3.14 Tabla: Lista de Ventas — Repartidor (Mis Entregas)

Sub-pestañas: Pendientes / Completadas / Fallidas

**Tarjeta de pedido en lista:**
- ID corto
- Fecha de asignación
- Nombre del cliente, teléfono, ciudad
- Dirección de entrega
- Lista de productos (nombre × cantidad)
- Badge de estado

**Vista de detalle de pedido:**
1. **Stepper de 4 pasos** (TRACKING_STEPS): Recibido / Confirmado / En Ruta / Entregado
2. **Datos del cliente**: nombre, teléfono (con copiar), dirección (con copiar), Google Maps (si existe)
3. **Lista de productos** a entregar
4. **Fecha y hora pactada** (si está agendado)
5. **Notas del pedido** (si existen)
6. **Botón de acción principal** (avanza al siguiente estado según el estado actual)
7. **Botón "Reportar Fallo"** (aparece en pedidos pendientes)

---

### 3.15 Tabla: Kardex / Historial de Inventario

Disponible en Admin (pestaña "Kardex - Historial") y en Delivery ("Historial").

**Columnas (Admin):**
| Fecha | Producto | Repartidor | Motivo | Cantidad | Antes | Después | Usuario |

**Columnas (Repartidor — Mi Inventario):**
| Fecha | Producto | Tipo | Vendedor | Cantidad | Antes | Después |

**Formato de badge Motivo/Tipo:**
- Entradas (addition): fondo verde claro (`bg-green-100`), texto verde oscuro (`text-green-800`), etiqueta en español
- Salidas (subtraction): fondo rojo claro (`bg-red-100`), texto rojo oscuro (`text-red-800`), etiqueta en español

**Formato de cantidad:**
- Entradas: icono `ArrowUpCircle` verde + `+N`
- Salidas: icono `ArrowDownCircle` rojo + `-N`

**Filtros del Kardex:**
- Desde / Hasta (inputs type="date")
- Producto (select)
- Tipo/Motivo (select: Todos / Carga / Venta / Ajuste / Devolución / Corrección)
- Botón "Limpiar filtros" (aparece solo si hay filtros activos; icono X)

**Paginación:** botón "Cargar más registros" (texto subrayado, centrado, aparece solo si `kardexHasMore === true`)

---

### 3.16 Tabla: Mesa de Validación (Admin — Liquidaciones)

| Columna | Contenido |
|---------|-----------|
| Vendedor / Semana | Nombre del vendedor + período en texto (`dd/MM` — `dd/MM/yyyy`) |
| Depósito ($) | Monto a confirmar, en grande |
| Evidencia | Referencia/folio + botón "Ver Ticket" (abre imagen en diálogo) |
| Estado | Badge de color (naranja Por Validar / verde Confirmado / rojo Rechazado) |
| Acciones | Botón verde "Aprobar" + botón rojo "Rechazar" (solo visibles si status=`reported`) |

---

### 3.17 Tabla: Ventas por Ciudad (Admin — Liquidaciones)

| Ciudad | Ventas | Total Cobrado | Com. Repartidor | Venta Neta |
|--------|--------|---------------|-----------------|------------|

Última fila: **Total General** en negrita.

---

### 3.18 Tabla: Paquetería por Repartidor (Admin — Paquetería)

Acordeón por repartidor con:
- Encabezado: nombre del repartidor, ciudad, métricas resumidas (activas, total cobrado, a depositar, comisión)
- Sub-tablas internas:
  - **En Ruta** (ventas activas): Cliente, Producto(s), Ciudad, Monto venta, A depositar, Comisión
  - **Entregados — Pendiente de Liquidar**: mismas columnas
  - **Liquidados**: mismas columnas + referencia de pago

---

### 3.19 Stepper de Estado de Entrega (STATUS_STEPS)

Usado en las páginas de Ventas del Admin y del Vendedor.

**Pasos en orden:**
1. `accepted` — "Confirmar" — Icono: Handshake
2. `contacting` — "Contacto" — Icono: Phone
3. `scheduled` — "Agendado" — Icono: CalendarDays
4. `in_transit` — "En camino" — Icono: Truck
5. `delivered` — "Entregado" — Icono: Package

**Visual:** íconos en círculos conectados por líneas horizontales. Paso completado: relleno primario. Paso actual: borde primario con animación. Pasos futuros: muted/gris.

**Tracking Steps del Repartidor:**
1. Recibido (status: `assigned`)
2. Confirmado (status: `accepted`)
3. En Ruta (status: `in_transit`)
4. Entregado (status: `delivered`)

---

### 3.20 Timer de 48 Horas (pending_return)

Se muestra en la columna de estado de ventas con status `pending_return`.

- **Con tiempo restante**: badge naranja pulsante — "Xh Ym restantes"
- **Tiempo expirado**: badge rojo pulsante con animación `animate-pulse` — "48HS VENCIDAS"
- Cálculo: `failedAt + 48 * 60 * 60 * 1000` comparado con `Date.now()`

---

### 3.21 Filtros de Período (Común a varios módulos)

Botones pill seleccionables en grupos:

| Etiqueta | Período |
|----------|---------|
| Hoy | Solo el día actual |
| Esta semana | Lunes a domingo de la semana actual |
| Este mes | Primer al último día del mes actual |
| Personalizado | Muestra dos inputs de fecha (Desde / Hasta) |

Los filtros activos se muestran con fondo primario / borde activo. Al seleccionar "Personalizado" aparecen inputs de fecha adicionales.

---

### 3.22 Acordeón de Inventario por Repartidor (Admin — Control de Mercancía)

Cada repartidor tiene un acordeón expandible que muestra:

- **Encabezado**: nombre, ciudad, badge con número de productos, valor total en stock
- **Contenido expandido**: lista de productos con columnas Total / Reservado / Disponible (números grandes con colores)
- **Footer**: "Valor Total en Stock: $X,XXX"

---

### 3.23 Paneles de Alerta

| Tipo | Borde | Fondo | Ícono |
|------|-------|-------|-------|
| Disputas de inventario | `border-destructive` | `bg-destructive/10` | AlertTriangle rojo |
| Stock bajo | `border-orange-400` | `bg-orange-50` | AlertTriangle naranja |
| Mercancía pendiente de confirmar | `border-orange-200 border-l-4` | `bg-orange-50` | AlertTriangle naranja |
| Error de datos | destructive Alert | — | AlertCircle rojo |

---

### 3.24 Vista de AI Insights

Disponible solo para Admin.

**Antes de generar:** solo un botón "Generar Análisis" centrado con icono Sparkles.

**Después de generar:** 4 tarjetas en grid 2x2:

| Tarjeta | Ícono | Color de cabecera |
|---------|-------|------------------|
| Tendencias Identificadas | TrendingUp | Primario |
| Sugerencias de Precios | Tag | Primario |
| Ajustes de Comisión | Percent | Primario |
| Recomendación Estratégica | Lightbulb | Fondo primario completo (`bg-primary text-primary-foreground`) |

Cada tarjeta de sugerencias muestra una lista de ítems con subtítulo (razón) en texto muted.

---

### 3.25 Selector de Semana (Repartidor — Mis Entregas)

- Línea de navegación con dos botones `ChevronLeft` / `ChevronRight`
- Texto central: "Semana del {dd/MM} al {dd/MM/yyyy}" o "Esta Semana (dd/MM — dd/MM)"
- Solo permite navegar hacia semanas pasadas (no al futuro)
- Badge de resumen: "N pedidos"

---

### 3.26 AlertDialog de Confirmación (Eliminar Venta)

Usado al presionar el icono Trash2 sobre una venta.

**Título:**
- Si la venta ya fue entregada: "¿Eliminar esta venta entregada?"
- Si no: "¿Eliminar esta venta?"

**Descripción:**
- Si entregada: "El pedido ya fue entregado. Esta acción no puede deshacerse."
- Si no entregada: "El stock se devolverá al inventario del vendedor automáticamente. Esta acción no puede deshacerse."

**Botones:** "Cancelar" (outline) / "Eliminar" (destructive, rojo).

---

### 3.27 Exportación Excel (Vendedor — Mis Reportes)

**Botón:** "Exportar Excel" (icono Download) — solo aparece si hay datos en el período seleccionado.

**Nombre del archivo:** `reporte-ventas-{nombre-vendedor}-{periodo}-{fecha-actual}.xlsx`

**Columnas del archivo Excel:**
1. Fecha
2. Cliente
3. Ciudad
4. Productos (lista separada por comas "ProductoXN")
5. Vendedor
6. Repartidor
7. Estado (etiqueta en español)
8. Total Cobrado
9. Comisión Repartidor

**Estilo del Excel:**
- Fila de encabezados: fondo azul oscuro (`0F172A`), texto blanco, negrita
- Filas alternadas: blanco / gris claro (`F8FAFC`)
- Columnas de monto: formato `$#,##0.00`
- Columna de fecha: formato `DD/MM/YYYY HH:mm`
- Autofit de columnas (mínimo 15 chars)
