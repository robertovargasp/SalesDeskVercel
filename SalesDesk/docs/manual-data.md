# SalesDesk — Manual de Datos y Lógica de Negocio

---

## 1. Roles y Módulos

### 1.1 Rol: Admin

El administrador tiene acceso completo a todas las secciones del sistema.

#### Rutas disponibles

| Ruta | Módulo |
|------|--------|
| `/dashboard` | Dashboard principal |
| `/dashboard/admin/products` | Productos |
| `/dashboard/admin/sellers` | Usuarios / Equipo |
| `/dashboard/admin/inventory` | Control de Mercancía |
| `/dashboard/admin/sales` | Ventas y Cobranza |
| `/dashboard/admin/delivery` | Paquetería |
| `/dashboard/admin/settlements` | Control de Liquidaciones |
| `/dashboard/admin/insights` | AI Sales Insights |

#### Módulo: Productos (`/dashboard/admin/products`)

**Datos mostrados:**
- Lista de productos en acordeón: nombre, precio de venta, comisión base, stock mínimo (alerta)

**Acciones:**
- **Nuevo Producto** (botón): abre diálogo para crear producto
- **Editar** (por producto): rellena el formulario con los datos actuales
- **Eliminar** (por producto): elimina directamente sin confirmación modal

#### Módulo: Usuarios / Equipo (`/dashboard/admin/sellers`)

**Datos mostrados:**
- Pestañas: Vendedores (N) / Repartidores (N)
- Por usuario: nombre, ciudad, rol badge, teléfono, email, WhatsApp, nombre de usuario (@username)
- Para vendedores: frecuencia de liquidación (Semanal/Quincenal), día de corte (día de la semana)

**Acciones:**
- **Nuevo Usuario** (botón): abre diálogo de registro
- **Editar** (por usuario): rellena formulario con datos actuales
- **Eliminar** (por usuario): diálogo de confirmación antes de eliminar
- **Filtrar por ciudad**: campo de búsqueda de texto libre

#### Módulo: Control de Mercancía (`/dashboard/admin/inventory`)

**Datos mostrados:**
- Alerta naranja si hay disputas pendientes
- Alerta naranja si hay stock bajo (producto, repartidor, cantidad disponible vs mínimo)
- Pestañas: Stock Actual / Por Ciudad / Kardex - Historial
- **Stock Actual**: tarjetas por repartidor con columnas Total / Reservado / Disponible por producto; valor total en stock
- **Por Ciudad**: tarjetas agrupadas por ciudad con total de unidades por producto (rojo si < mínimo, verde si ok)
- **Kardex**: tabla de movimientos con columnas Fecha, Producto, Repartidor, Motivo, Cantidad (+/-), Antes, Después, Usuario

**Acciones:**
- **Enviar Mercancía** (formulario lateral): asigna stock a repartidor
- **Ajuste Manual** (botón): diálogo para corregir inventario
- **Filtrar por Repartidor** (select)
- **Filtrar Kardex** por repartidor y por producto
- **Cargar más registros** (paginación de 100 en 100)

#### Módulo: Ventas y Cobranza (`/dashboard/admin/sales`)

**Datos mostrados:**
- Métricas: Total Entregado / En Ruta (valor $) / Comisiones Repartidores ($)
- Cartera de Vendedores: acordeón por vendedor con contadores de ventas en ruta / entregadas / fallidas
- Tabla de ventas por vendedor: Fecha, Cliente (oculto si status=`assigned`), Cuentas ($), Rastreador Logístico (timeline), Repartidor, Acción
- Columna Cuentas muestra "Cobrado" y "A LIQUIDAR"
- Timeline de estado como íconos circulares

**Acciones:**
- **Nueva Venta Directa** (botón): abre formulario completo
- **Asignar Repartidor / Reasignar** (por venta no finalizada): diálogo con lista de repartidores
- **Eliminar venta** (icono Trash2): diálogo de confirmación AlertDialog; deshabilitado si la venta tiene `settlementId`
- **Filtros**: período (hoy/semana/mes/personalizado), ciudad, repartidor, grupo de estado (en_ruta/completada/liquidada/cancelada/fallida)
- **Limpiar filtros** (botón aparece cuando hay filtros activos)

#### Módulo: Paquetería (`/dashboard/admin/delivery`)

**Datos mostrados:**
- Métricas: Pendiente de Cobro / Total Liquidado / Comisiones Totales / Entregas en Proceso
- Tabla "Pedidos sin Repartidor": Pedido, Cliente, Productos, Estado, botón Asignar
- Acordeón por repartidor con subtablas: En Ruta / Entregados-Pendiente de Liquidar / Liquidados
- Columnas por sección: Cliente, Producto(s), Ciudad, Monto venta, A depositar, Comisión
- Tabla "Liquidaciones Reportadas": Repartidor, Período, Cobrado, Comisión, Depósito, botón Confirmar

**Acciones:**
- **Asignar Repartidor** (por venta sin asignar): diálogo
- **Confirmar liquidación** (por liquidación reportada): diálogo de confirmación con imagen del comprobante
- **Filtros**: período (todo/hoy/semana/mes/personalizado), repartidor, ciudad, producto

#### Módulo: Control de Liquidaciones (`/dashboard/admin/settlements`)

**Datos mostrados:**
- Métricas: Total Ventas / Comisión Repartidores / Venta Neta / A Recibir
- Tabla "Ventas por Ciudad": Ciudad, Ventas (count), Total Cobrado, Com. Repartidor, Venta Neta + fila Total General
- Mesa de Validación (tabla): Vendedor/Semana, Depósito ($), Evidencia (referencia + botón "Ver Ticket"), Estado badge, Acciones
- Panel "Instrucciones de Pago": texto libre editable
- Panel "Métricas de Caja": por validar / total confirmado

**Acciones:**
- **Aprobar** (liquidación en estado `reported`): botón directo o dentro del modal de comprobante
- **Rechazar** (liquidación en estado `reported`): abre diálogo que exige motivo de rechazo (campo obligatorio)
- **Editar Instrucciones de Pago** (icono Pencil): textarea editable con Guardar/Cancelar
- **Filtros**: período, repartidor, ciudad, búsqueda por nombre de vendedor

#### Módulo: AI Sales Insights (`/dashboard/admin/insights`)

**Datos mostrados (tras generar análisis):**
- Tarjeta Tendencias Identificadas: lista de tendencias detectadas
- Tarjeta Sugerencias de Precios: por producto con precio sugerido y razón
- Tarjeta Ajustes de Comisión: por producto o vendedor con comisión sugerida y razón
- Tarjeta Recomendación Estratégica: texto resumen

**Acciones:**
- **Generar Análisis** (botón): llama al flujo de IA con datos actuales de ventas; muestra spinner mientras carga

---

### 1.2 Rol: Vendedor (Seller)

#### Rutas disponibles

| Ruta | Módulo |
|------|--------|
| `/dashboard` | Mi Panel (dashboard) |
| `/dashboard/seller/inventory` | Mi Inventario (inventario de repartidores) |
| `/dashboard/seller/sales` | Mis Ventas (gestión y progreso) |
| `/dashboard/seller/delivery` | Asignar Repartidores / Paquetería |
| `/dashboard/seller/settlements` | Mis Reportes (liquidaciones) |

#### Módulo: Mi Inventario (`/dashboard/seller/inventory`)

**Datos mostrados:**
- Tarjetas por repartidor vinculado a sus pedidos: nombre, ciudad, totales (Total/Reservado/Disponible)
- Tabla por repartidor: Producto, Precio, Total, Reservado, Disponible (naranja si bajo mínimo, verde si ok)

**Acciones:** Solo lectura; sin acciones directas.

#### Módulo: Mis Ventas (`/dashboard/seller/sales`)

**Datos mostrados:**
- Métricas: Total Entregado / En Ruta (valor $) / Comisiones Repartidores
- Resumen por ciudad: tabla Ciudad → count de ventas
- Tabla "Últimas Ventas": Fecha/Ciudad, Monto, Comisión Repartidor
- Tabla "Mis Repartidores": Repartidor, Activos, Entregados, Fallidos, Comisión Pendiente
- Tarjetas de ventas en cuadrícula (3 columnas): ID, fecha, estado badge, nombre cliente, repartidor asignado, total venta
- Vista de detalle de venta individual: timeline de pasos, datos del cliente (ocultados hasta aceptar), foto de referencia, totales, acordeón

**Acciones (en lista):**
- **Nueva Venta Directa** (botón): formulario idéntico al del admin
- **Eliminar venta** (icono Trash2 en tarjeta): solo si status en `['assigned','accepted','contacting','scheduled','in_transit']`; diálogo de confirmación
- Click en tarjeta → abre vista de detalle

**Acciones (en detalle de venta):**
- **ACEPTAR VENTA** (banner si status=`assigned`): cambia a `accepted`
- **RECHAZAR** (banner si status=`assigned`): abre diálogo exigiendo motivo; cambia a `cancelled`
- **Avanzar al siguiente paso** (botones según estado actual): Contacto → Agendado → En camino → Entregado
- **Agendar Entrega**: abre diálogo con calendario (selector de fecha) y campo de hora; al confirmar guarda fecha+hora en la venta
- **Ver Ubicación Exacta** (si hay googleMapsLink): abre Google Maps en nueva pestaña
- **Copiar** nombre/teléfono/dirección al portapapeles
- **Ver foto de referencia** a pantalla completa (diálogo)
- Filtros en la lista: Ciudad, Repartidor, Estado (pills seleccionables), Cliente (búsqueda texto), Período, Monto Mín/Máx

#### Módulo: Asignar Repartidores (`/dashboard/seller/delivery`)

**Datos mostrados:**
- Métricas clickeables: En Curso / Entregados / Fallidos / Sin Asignar
- Tabla "Ventas sin Repartidor": Venta (ID + link), Cliente, Productos, Estado, botón Asignar
- Acordeón por repartidor: tabla con columnas Venta, Cliente, Dirección, Vendedor, Estado, Acción
- Diálogo de detalle de entrega: Productos, montos (Cobrado/Comisión/A liquidar), fechas, comentarios, motivo de fallo

**Acciones:**
- **Asignar Repartidor** (por venta sin asignar): diálogo con lista de repartidores
- **Reasignar** (por venta en status `in_transit`): diálogo de reasignación
- **Ver detalle** (por venta): diálogo con información completa
- Filtros: Repartidor, Ciudad, Producto, Estado (pills), Rango de fechas, Monto Min/Máx; click en métricas filtra automáticamente

#### Módulo: Mis Reportes (`/dashboard/seller/settlements`)

**Datos mostrados:**
- Métricas: Ventas (count), Total Ventas ($), Comisiones Repartidores ($), Entregadas (count)
- Tabla "Ventas por Ciudad": Ciudad, Repartidor, Ventas, Total Cobrado, Comisión Rep.
- Tabla "Pedidos del período": Fecha, Cliente/Ciudad, Productos, Repartidor, Estado badge, Cobrado, Comisión Rep.

**Acciones:**
- **Exportar Excel** (botón): genera archivo `.xlsx` con ExcelJS con todos los datos del período filtrado; nombre: `reporte-ventas-{seller}-{periodo}-{fecha}.xlsx`
- Filtros período: Hoy / Esta semana / Este mes / Personalizado (rango fechas)
- Filtros adicionales: Repartidor, Estado, Ciudad, Orden (reciente/antiguo/mayor monto/menor monto)

---

### 1.3 Rol: Repartidor (Delivery)

#### Rutas disponibles

| Ruta | Módulo |
|------|--------|
| `/dashboard/delivery` | Mis Entregas + Liquidar |
| `/dashboard/delivery/inventory` | Mi Inventario |

#### Módulo: Mis Entregas + Liquidar (`/dashboard/delivery`)

**Pestañas:** Mis Entregas / Liquidar

**Sub-pestaña: Mis Entregas**

*Datos mostrados:*
- Navegación semanal (anterior/actual) con fechas del lunes al domingo
- Contadores filtrados por semana: Pendientes / Entregadas / Fallidas
- Resumen financiero de la semana: Entregadas hoy, Total cobrado, Mi comisión
- Sub-pestañas de pedidos: Pendientes (N) / Completadas (N) / Fallidas (N)
- Tarjetas de pedido: ID, fecha, nombre cliente, teléfono, ciudad, dirección, productos
- Vista de detalle de pedido: timeline de 4 pasos (Recibido/Confirmado/En Ruta/Entregado), datos del cliente, productos a entregar, fecha pactada

*Acciones (en lista):*
- Click en tarjeta → abre vista de detalle

*Acciones (en detalle):*
- **Confirmar Pedido Recibido** (si status=`assigned`): avanza a `accepted`
- **Salí a Entregar** (si status=`accepted` o `contacting`): avanza a `scheduled`
- **Estoy En Ruta** (si status=`scheduled`): avanza a `in_transit`
- **Marcar como Entregado** (si status=`in_transit`): abre diálogo de confirmación de entrega
- **Reportar Fallo** (en cualquier estado activo): abre diálogo de selección de motivo
- **Ver en Google Maps** (si hay link): nueva pestaña
- **Copiar** nombre/teléfono/dirección

*Diálogo "Confirmar Entrega":*
- Opciones: Entregado / No lo quiere / Rechazado / Reportar problema
- Campo de comentario opcional
- Botón Confirmar (requiere seleccionar opción)

*Diálogo "Reportar Fallo en Entrega":*
- Opciones predefinidas: Cliente no estaba en casa / Cliente no contestó / Dirección incorrecta / Cliente canceló / Zona de riesgo / Problema de vehículo / Otro
- Si "Otro": campo de texto libre
- Botón "Confirmar Fallo" (requiere selección)

**Sub-pestaña: Liquidar**

*Datos mostrados:*
- Resumen Balance a liquidar: Total cobrado / Mi comisión / A depositar
- Lista de entregas sin liquidar (checkboxes seleccionables)
- Historial de liquidaciones enviadas: período, fecha, monto, badge de estado

*Acciones:*
- Seleccionar/deseleccionar pedidos individuales o todos
- Campo "Monto a depositar" (pre-calculado, editable)
- Campo "Referencia / Folio de depósito" (obligatorio)
- Subir foto del comprobante (obligatorio, acepta `image/*`, con captura de cámara)
- **Enviar al Admin** (botón verde): envía el reporte; bloqueado si faltan monto, referencia o comprobante

#### Módulo: Mi Inventario (`/dashboard/delivery/inventory`)

**Datos mostrados:**
- Tarjetas métricas: Total unidades / Reservado (en pedidos activos) / Disponible (para nuevas ventas)
- Alerta naranja con lista de asignaciones pendientes de confirmar
- Tabla "Mi Stock Actual": Producto, Precio, Total, Reservado, Disponible; badge "STOCK BAJO" si disponible < mínimo
- Tabla "Historial (Kardex)": Fecha, Producto, Tipo (badge verde/rojo), Vendedor, Cantidad (+/-), Antes, Después

**Acciones:**
- **Confirmar Recepción** (por asignación pendiente): actualiza el inventario
- Filtros del kardex: Desde (fecha), Hasta (fecha), Producto (select), Tipo (Carga/Venta/Ajuste/Devolución/Corrección)
- **Limpiar filtros** (aparece si hay filtros activos)
- **Cargar más registros** (paginación)

---

## 2. Flujos Principales

### 2.1 Flujo de Venta Completo

**Creación (Admin o Vendedor)**
1. El admin o vendedor abre el diálogo **"Registrar Venta Directa"**
2. Selecciona: vendedor responsable (admin puede elegir cualquiera; vendedor se auto-asigna), repartidor, ciudad, datos del cliente (nombre*, teléfono*, dirección*), link de Google Maps (opcional), cantidades por producto, foto de comprobante (opcional), totales
3. El sistema valida: vendedor seleccionado, nombre del cliente, repartidor, teléfono, dirección, al menos un producto con cantidad >0, stock disponible del repartidor
4. Si hay error de stock, los campos se marcan en rojo con el máximo disponible
5. Al confirmar: se crea la orden con `status = "assigned"`, se reserva el stock (`reservedQuantity` aumenta), se registra evento de creación en `order_events`

**Asignación**
- Status: `assigned` — venta asignada al repartidor (cliente oculto al vendedor hasta aceptar)
- El repartidor ve la venta en su sub-pestaña "Pendientes"

**Aceptación**
- El repartidor (o vendedor) acepta la venta: status → `accepted`
- El vendedor ahora puede ver los datos del cliente

**Progreso de entrega (repartidor)**
- `accepted` → `contacting` → `scheduled` → `in_transit` → `delivered`
- Al marcar `scheduled` se guarda fecha y hora de entrega acordada
- El repartidor también puede reportar fallo en cualquier punto activo

**Entrega exitosa**
- El repartidor elige "Entregado" en el diálogo: status → `delivered`
- El stock se descuenta del inventario del repartidor (kardex registra motivo `sale`)
- La `reservedQuantity` disminuye

**Confirmación del admin**
- El admin puede confirmar la entrega desde Paquetería: status → `delivery_confirmed`

**Liquidación**
- El repartidor reporta el depósito (sub-pestaña Liquidar): crea un `WeeklySettlement` con status `reported`
- La venta queda vinculada al `settlementId`
- El admin aprueba en "Control de Liquidaciones": settlement status → `confirmed`, venta status → `paid`
- Si el admin rechaza: settlement status → `rejected`, se guarda el motivo de rechazo

**Fallo de entrega**
- El repartidor reporta fallo: status → `delivery_failed`, se guarda `failureReason` y `failedAt`
- Status puede pasar a `pending_return` (esperando decisión: cancelar o reintentar)
- Existe un contador de 48 horas desde `failedAt`; al vencerse, se muestra "48HS VENCIDAS" en rojo pulsante

---

### 2.2 Flujo de Inventario

1. **El admin asigna stock**: en "Enviar Mercancía" selecciona repartidor + cantidades por producto → se crea un `InventoryAssignment` con status `pending` → el kardex registra movimiento de tipo `addition` con motivo `load`
2. **El repartidor confirma recepción**: en "Mi Inventario" ve las asignaciones pendientes → hace click en "Confirmar Recepción" → el assignment pasa a status `confirmed` → el inventario queda activo
3. **Al registrar una venta**: si hay repartidor asignado, el sistema verifica que el stock disponible (quantity - reservedQuantity) sea suficiente; si no, bloquea la venta y muestra cuánto hay disponible; si hay stock, la `reservedQuantity` aumenta
4. **Al marcar entrega como exitosa**: kardex registra motivo `sale` (tipo `subtraction`), la `quantity` del inventario disminuye, la `reservedQuantity` vuelve a bajar
5. **Ajuste manual** (admin): desde "Ajuste Manual" puede sumar o restar stock con razón libre (adjustment, return, correction); queda registrado en kardex

---

### 2.3 Flujo de Liquidación

**Liquidación de Repartidor:**
1. El repartidor entra a la sub-pestaña "Liquidar"
2. Selecciona los pedidos entregados que quiere incluir (por defecto todos seleccionados)
3. Verifica el monto calculado (editable), ingresa la referencia/folio del depósito (obligatorio), sube foto del comprobante (obligatorio)
4. Presiona "Enviar al Admin" → se crea un `WeeklySettlement` con status `reported`
5. El admin ve el reporte en "Control de Liquidaciones" con badge naranja "Por Validar"
6. El admin puede ver el comprobante (diálogo "Ver Ticket") y luego:
   - **Aprobar**: settlement → `confirmed`, ventas vinculadas → `paid`
   - **Rechazar**: settlement → `rejected`, el repartidor ve el motivo en su historial; las ventas quedan disponibles nuevamente

**Liquidación de Vendedor:**
- El vendedor solo tiene vista de reportes (Mis Reportes); no genera liquidaciones directas

---

### 2.4 Estados de Pedido (SaleStatus)

| Status | Etiqueta UI | Rol que lo activa | Acción en inventario |
|--------|------------|-------------------|---------------------|
| `assigned` | Por Aceptar / En Ruta | Sistema al crear venta | `reservedQuantity` aumenta |
| `accepted` | En Ruta / Confirmada | Repartidor o vendedor (acepta) | Sin cambio |
| `contacting` | En Ruta / En Contacto | Vendedor (avanza estado) | Sin cambio |
| `scheduled` | En Ruta / Agendado | Vendedor (agenda entrega) | Guarda fecha/hora |
| `in_transit` | En Camino | Vendedor (avanza estado) | Sin cambio |
| `delivered` | Entregado | Repartidor (confirma entrega) | `quantity` baja, `reservedQuantity` baja |
| `delivery_confirmed` | Entregado / Confirmado | Admin | Sin cambio |
| `paid` | Liquidado / Completado | Admin (al confirmar settlement) | Sin cambio |
| `cancelled` | Cancelado | Vendedor (rechaza) o Admin | `reservedQuantity` baja (stock devuelto) |
| `delivery_failed` | Fallido / No Entregado | Repartidor (reporta fallo) | Sin cambio; `failedAt` se registra |
| `pending_return` | Devolución | Sistema (tras fallo) | Espera decisión; timer 48h |

**Grupos de estado en filtros:**
- **En ruta**: `assigned`, `accepted`, `contacting`, `scheduled`, `in_transit`
- **Completada**: `delivered`, `delivery_confirmed`
- **Liquidada**: `paid`
- **Cancelada**: `cancelled`
- **Fallida**: `delivery_failed`, `pending_return`

---

## 3. Reglas de Negocio

### 3.1 Validaciones de Formularios

#### Formulario "Registrar Venta Directa" (Admin y Vendedor)

| Campo | Tipo | Requerido | Validación / Mensaje de error |
|-------|------|-----------|-------------------------------|
| Vendedor Responsable | Select | Sí | "Seleccione un vendedor responsable." |
| Repartidor | Select | Sí | "Selecciona el repartidor que entregará el pedido." |
| Cliente (nombre) | Texto | Sí | "Debe ingresar el Nombre del Cliente para continuar." |
| Teléfono | Texto | Sí | "El teléfono es requerido" |
| Dirección de Entrega | Texto | Sí | "La dirección es requerida" |
| Ciudad | Texto | No | Se auto-rellena con la ciudad del repartidor seleccionado |
| Google Maps Link | URL | No | — |
| Foto de comprobante | Imagen | No | — |
| Cantidades de productos | Número (≥0) | Al menos 1 | "Ingrese cantidades para al menos un producto." |
| Cantidades vs stock | Número | — | "Corrige las cantidades marcadas en rojo. Máx. {disponible}" |
| Total Venta | Número | Auto | Calculado; editable manualmente |
| Comisión Repartidor | Número | Auto | Calculado; editable manualmente |

#### Formulario "Registrar Usuario" (Admin)

| Campo | Tipo | Requerido | Validación / Mensaje de error |
|-------|------|-----------|-------------------------------|
| Rol | Select | Sí | No editable al editar |
| Nombre Completo | Texto | Sí | "Nombre requerido" |
| Usuario (username) | Texto | Sí | "Usuario requerido"; "Solo letras, números y guión bajo. Sin espacios." |
| Ciudad | Texto | Sí | "Ciudad requerida"; "Mínimo 3 caracteres" |
| Teléfono | Número | No | "Solo números, mínimo 10 dígitos" |
| WhatsApp | Número | No | "Solo números, mínimo 10 dígitos" |
| Email | Email | No | — |
| Contraseña | Password | Sí (al crear) | Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial (!@#$%&*) |
| Confirmar Contraseña | Password | Sí (al crear) | "Las contraseñas no coinciden" |

**Regla adicional:** Si el `username` ya existe en el sistema: "El nombre de usuario ya está en uso."

#### Formulario "Nuevo Producto" (Admin)

| Campo | Tipo | Requerido | Validación / Mensaje de error |
|-------|------|-----------|-------------------------------|
| Nombre | Texto | Sí | "El nombre es requerido" |
| Precio ($) | Número | Sí | "El precio debe ser mayor a 0." |
| Comisión Base ($) | Número | No | Por defecto: 200; "La comisión no puede ser negativa." |
| Stock Mínimo (alerta) | Número entero | No | Por defecto: 4; "El stock mínimo no puede ser negativo." |
| Descripción | Texto | No | — |

#### Formulario "Enviar Mercancía" / Asignación de Inventario (Admin)

| Campo | Validación |
|-------|------------|
| Repartidor | "Selecciona un repartidor para realizar la carga." |
| Cantidades | No pueden ser negativas; "Las cantidades no pueden ser negativas." |
| Al menos 1 cantidad >0 | "Ingresa al menos una cantidad para un producto." |

#### Formulario "Ajuste Manual" de Inventario (Admin)

| Campo | Validación |
|-------|------------|
| Repartidor | "Selecciona un repartidor para el ajuste." |
| Producto | "Selecciona el producto a ajustar." |
| Cantidad | "La cantidad debe ser mayor a 0." |

#### Formulario de Liquidación (Repartidor)

| Campo | Validación |
|-------|------------|
| Pedidos seleccionados | "Selecciona al menos un pedido para incluir en el reporte." |
| Monto a depositar | "Ingresa una cantidad mayor a 0." |
| Referencia / Folio | "Ingresa el folio o referencia de depósito." |
| Foto del comprobante | "Toma una foto del comprobante antes de enviar." (obligatorio) |

#### Formulario de Rechazo de Liquidación (Admin)

| Campo | Validación |
|-------|------------|
| Motivo del rechazo | Obligatorio; botón deshabilitado hasta que haya texto |

#### Formulario de Rechazo de Venta (Vendedor)

| Campo | Validación |
|-------|------------|
| Motivo del Rechazo | "Por favor indica el motivo del rechazo." |

#### Formulario de Agendar Entrega (Vendedor)

| Campo | Validación |
|-------|------------|
| Fecha (calendario) | "Debes seleccionar el día del acuerdo." |
| Hora | Opcional; texto libre (ej. "3:30 PM") |

---

### 3.2 Restricciones por Rol

#### Admin
- Puede ver y modificar todos los datos del sistema
- Puede registrar ventas en nombre de cualquier vendedor
- Puede asignar/reasignar repartidores a cualquier venta no finalizada
- Puede eliminar ventas que no tengan `settlementId`
- Puede crear usuarios con rol `seller` o `delivery` únicamente (no puede crear otro admin desde la UI)
- Solo el admin puede confirmar o rechazar liquidaciones
- Solo el admin puede ajustar manualmente el inventario

#### Vendedor
- Solo ve sus propias ventas (`sellerId === currentUser.id`)
- Solo ve sus propias liquidaciones
- Solo ve el inventario de los repartidores vinculados a sus ventas
- No puede registrar ventas para otro vendedor: "No puedes registrar ventas para otro usuario."
- Solo puede registrar ventas con repartidores que ya tienen inventario o ya trabajan con él (`availableDeliveryPersons`)
- Los datos del cliente están ocultos (`**********`) en la tarjeta hasta que el vendedor acepta la venta
- No puede asignar repartidores a ventas finalizadas (`paid`, `cancelled`)
- Puede reasignar solo ventas en status `in_transit`
- No puede eliminar ventas ya liquidadas (con `settlementId`)

#### Repartidor
- Solo ve sus propias ventas (`deliveryPersonId === currentUser.id`)
- Solo ve su propio inventario y kardex
- No puede ver datos de otros repartidores ni otros vendedores
- Debe confirmar la recepción de mercancía enviada por el admin (pendientes de confirmar)
- Puede avanzar los estados de sus pedidos y reportar fallos
- Solo puede reportar liquidaciones de sus propias entregas

---

### 3.3 Reglas de Negocio Específicas

#### Stock
- `MIN_STOCK_DEFAULT = 4` — valor por defecto para alerta de stock bajo si el producto no tiene `minStock` definido
- El sistema valida el stock disponible (`quantity - reservedQuantity`) antes de permitir registrar una venta
- Cuando se cancela una venta, el sistema devuelve el stock al inventario automáticamente
- Al crear una venta, la `reservedQuantity` aumenta; al completar la entrega, la `quantity` baja y la `reservedQuantity` baja
- En el formulario de venta, el stock se muestra en badge rojo si es < 5 unidades

#### Liquidaciones y 48 horas
- Cuando una entrega falla, se registra `failedAt` (timestamp)
- El sistema calcula un countdown de 48 horas: `new Date(failedAt).getTime() + 48 * 60 * 60 * 1000`
- Si quedan horas: etiqueta naranja "{h}h {m}m restantes"
- Si se vencieron: etiqueta roja pulsante "48HS VENCIDAS"

#### Usuarios y autenticación
- Login: si el username es "admin" → email `admin@salesdesk.com`; si contiene "@" → se usa tal cual; de lo contrario → `{username}@salesdesk.com`
- El username debe ser único en el sistema; no puede editarse el rol una vez creado
- Si el usuario está autenticado pero no tiene perfil en la BD, se muestra pantalla de error "Error de Perfil"

#### Datos realtime
- Todas las tablas (products, profiles, inventory_items, inventory_assignments, orders, order_items, order_events, settlements, kardex_entries, app_config) tienen suscripciones realtime de Supabase; los cambios se reflejan automáticamente sin recargar
- El kardex se pagina de 100 en 100 registros; hay botón "Cargar más registros" cuando `kardexHasMore === true`

#### Campos ocultos por seguridad
- En la vista de ventas del admin y del vendedor, cuando una venta está en status `assigned`, el nombre del cliente se muestra como `**********`
- El vendedor no puede ver los datos del cliente hasta que acepta la venta (avanza de `assigned` a `accepted`)

#### Movimientos del Kardex
- Tipos: `addition` (entrada) | `subtraction` (salida)
- Motivos: `load` (Carga) | `sale` (Venta) | `adjustment` (Ajuste) | `return` (Devolución) | `correction` (Corrección)
- Estados de asignación: `pending` | `confirmed` | `disputed`
- En el kardex se registra `balanceBefore` y `balanceAfter` en el momento del movimiento

#### Instrucciones de Pago
- El admin puede editar un campo de texto libre (`paymentInfo`) que es visible para los vendedores en el módulo de liquidaciones; se almacena en la tabla `app_config` con `key = 'payment_info'`

---

### 3.4 Mensajes de Confirmación / Alertas del Sistema

| Situación | Tipo | Mensaje |
|-----------|------|---------|
| Stock asignado a repartidor | Toast éxito | "Movimiento Registrado — Se han enviado productos. Esperando confirmación del repartidor." |
| Recepción de inventario confirmada | Toast éxito | "Recepción confirmada — El inventario ha sido actualizado." |
| Entrega marcada como exitosa | Toast éxito | "¡Entregado! — El pedido fue marcado como entregado." |
| Venta rechazada por vendedor | Toast éxito | "Venta Rechazada — Se ha notificado al administrador y devuelto el stock." |
| Texto copiado al portapapeles | Toast | "Copiado — Información copiada al portapapeles." |
| Eliminar venta entregada | AlertDialog | "¿Eliminar esta venta entregada? El pedido ya fue entregado. Esta acción no puede deshacerse." |
| Eliminar venta no entregada | AlertDialog | "El stock se devolverá al inventario del vendedor automáticamente." |
| Rechazar liquidación | Dialog | "El repartidor verá este motivo y los pedidos quedarán disponibles nuevamente." |
| Confirmar liquidación | Dialog | "¿Confirmar el depósito de {nombre} por ${monto}? Las ventas vinculadas quedarán como pagadas." |
| Disputas pendientes de inventario | Alert destructive | "Hay Disputas Pendientes — Un repartidor reportó una discrepancia en su última carga." |
| Stock bajo | Alert naranja | "Stock Bajo — {N} alerta(s)" con detalles de producto y repartidor |
