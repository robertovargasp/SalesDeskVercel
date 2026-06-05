# SalesDesk — Estado Actual

## Stack

* Next.js 15
* Firebase Auth
* Firestore
* Firebase Storage
* Tailwind
* shadcn/ui
* TypeScript

## Arquitectura

* useStore() centralizado
* Firestore realtime
* App Router
* Roles protegidos

---

# FASE 1 COMPLETADA

## Roles

* admin
* seller
* delivery

Implementado:

* rutas protegidas
* delivery dashboard
* permisos firestore
* ciudades asignadas
* whatsapp field

---

# Tracking Pedidos

Estados:

1. pedido_recibido
2. enviado
3. in_transit
4. entregado

Extras:

* cancelled
* delivery_failed

Implementado:

* trackingStep
* failureReason
* failureStep
* assignDeliveryPerson()
* reportDeliveryFailure()
* historial eventos

---

# Inventario

Implementado:

* validación stock
* evitar negativos
* minStock
* alertas stock bajo
* ajustes manuales
* kardex básico

---

# Seguridad

Implementado:

* crypto.randomUUID()
* eliminado password del modelo
* paymentInfo en Firestore
* firestore.rules mejoradas

---

# Firebase Storage

Implementado:

* lib/storage.ts
* validaciones
* estructura subida imágenes

Pendiente:

* activar Firebase Storage Console

---

# Nuevas Vistas

* /admin/delivery
* /dashboard/delivery

---

# Archivos Clave

* types.ts
* hooks/use-store.ts
* lib/storage.ts
* firestore.rules

---

# PENDIENTE FASE 2

## Dashboard

* métricas reales
* ventas por ciudad
* dinero pendiente
* pedidos fallidos

## Filtros

* ventas
* liquidaciones
* inventario

## Notificaciones

* low_stock
* delivery_failed
* settlement_pending

## WhatsApp

* webhook preparado
* integración futura

---

# Reglas Proyecto

* NO romper frontend
* mantener diseño actual
* mantener useStore()
* respuestas cortas
* reutilizar componentes
* código escalable
* evitar duplicar lógica
