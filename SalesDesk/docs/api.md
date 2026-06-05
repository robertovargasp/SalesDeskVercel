# API Routes — SalesDesk

## Endpoints disponibles

### POST `/api/users/create`

Crea un nuevo usuario en Supabase Auth. Requiere `SUPABASE_SERVICE_ROLE_KEY` configurado.

**Request:**
```json
{
  "email": "vendedor@salesdesk.com",
  "password": "contraseña_segura"
}
```

**Response 200:**
```json
{ "id": "uuid-del-nuevo-usuario" }
```

**Response 400:**
```json
{ "error": "User already registered" }
```

**Response 503:**
```json
{ "error": "NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos" }
```

**Flujo completo para crear un usuario:**
1. Llamar a `/api/users/create` → obtiene el UUID
2. Hacer `INSERT` en `profiles` con ese UUID como `id`

---

## Datos en tiempo real (Supabase Realtime)

No se usa HTTP polling. El cliente se suscribe a cambios de la base de datos via WebSocket:

```typescript
supabase
  .channel('store-{uid}')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
  .subscribe()
```

Tablas con subscripciones activas:
- `products`
- `profiles`
- `inventory_items`
- `inventory_assignments`
- `orders` + `order_items` + `order_events`
- `settlements`
- `kardex_entries`
- `app_config`
