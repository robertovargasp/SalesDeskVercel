# Arquitectura — SalesDesk

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript 5 |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Storage | Supabase Storage |
| UI | shadcn/ui + Tailwind CSS |
| Estado | useStore() hook (client-side) |
| Realtime | Supabase Realtime (postgres_changes) |
| IA | Google Genkit + Gemini |

## Diagrama de flujo de datos

```
Browser
  │
  ├── SupabaseProvider (providers/)
  │     └── Auth state (user, isUserLoading)
  │
  ├── useStore() hook (hooks/use-store.ts)
  │     ├── Supabase queries → Datos en estado local
  │     ├── Supabase Realtime → Actualizaciones en tiempo real
  │     └── Mutations → INSERT/UPDATE/DELETE a Supabase
  │
  ├── Dashboard Pages (app/dashboard/)
  │     └── Consumen useStore() para datos y acciones
  │
  └── API Routes (app/api/)
        └── /api/users/create → Crea usuarios via service_role
```

## Roles y acceso

| Rol | Acceso |
|---|---|
| `admin` | Total — gestiona productos, vendedores, inventario, ventas, liquidaciones |
| `seller` | Sus propias ventas, inventario, liquidaciones |
| `delivery` | Solo los pedidos asignados a él |

El control de acceso se aplica en dos niveles:
1. **Frontend:** `useStore()` filtra queries por `user.id` y `role`
2. **Backend:** RLS (Row Level Security) en Supabase bloquea cualquier acceso no autorizado

## Patrón de estado (useStore)

```
useStore()
  ├── Estado: users, products, inventory, assignments, sales,
  │           settlements, kardex, paymentInfo, currentUser
  │
  ├── Carga: useEffect → supabase.from('tabla').select('*')
  │
  ├── Realtime: supabase.channel('store-{uid}')
  │              .on('postgres_changes', ...) → re-fetch
  │
  └── Mutaciones: supabase.from('tabla').insert/update/delete()
```

## Seguridad

- Variables de entorno: `NEXT_PUBLIC_*` solo para claves públicas
- `SUPABASE_SERVICE_ROLE_KEY`: solo en server-side (`/api/users/create`)
- RLS activo en todas las tablas de Supabase
- Middleware protege todas las rutas `/dashboard/*`
- No hay credenciales hardcodeadas en el código
