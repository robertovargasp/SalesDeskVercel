# Estructura del Proyecto — SalesDesk

## Árbol de directorios

```
SalesDesk/
├── docs/                          # Documentación del proyecto
│   ├── arquitectura.md
│   ├── estructura-proyecto.md     # Este archivo
│   ├── base-datos.md
│   ├── api.md
│   └── migracion-supabase.md
│
├── src/
│   ├── app/                       # Next.js App Router (páginas + API routes)
│   │   ├── api/
│   │   │   └── users/create/      # POST — crea usuarios en Supabase Auth
│   │   ├── dashboard/
│   │   │   ├── admin/             # Rutas exclusivas para rol admin
│   │   │   │   ├── delivery/      # Gestión de repartidores
│   │   │   │   ├── insights/      # IA — resúmenes de ventas
│   │   │   │   ├── inventory/     # Inventario + kardex
│   │   │   │   ├── products/      # CRUD de productos
│   │   │   │   ├── sales/         # Control de ventas
│   │   │   │   ├── sellers/       # Gestión de vendedores
│   │   │   │   └── settlements/   # Validación de liquidaciones
│   │   │   ├── delivery/          # Panel de repartidor
│   │   │   ├── seller/            # Panel de vendedor
│   │   │   │   ├── inventory/
│   │   │   │   ├── sales/
│   │   │   │   └── settlements/
│   │   │   ├── settings/          # Configuración
│   │   │   ├── layout.tsx         # Layout del dashboard (auth guard)
│   │   │   └── page.tsx           # Dashboard principal (métricas)
│   │   ├── globals.css
│   │   ├── layout.tsx             # Root layout (SupabaseProvider)
│   │   └── page.tsx               # Login page
│   │
│   ├── ai/                        # Genkit AI flows (insights, reportes)
│   │   ├── flows/
│   │   └── genkit.ts
│   │
│   ├── components/                # Componentes React reutilizables
│   │   ├── ui/                    # shadcn/ui — NO MODIFICAR directamente
│   │   └── dashboard/
│   │       └── sidebar-nav.tsx    # Navegación lateral del dashboard
│   │
│   ├── hooks/                     # React hooks personalizados
│   │   ├── use-store.ts           # ★ Store central — gestiona todo el estado
│   │   ├── use-mobile.tsx         # Detecta viewport móvil
│   │   └── use-toast.ts           # Notificaciones toast
│   │
│   ├── lib/                       # Utilidades y helpers
│   │   ├── supabase/              # Clientes Supabase
│   │   │   ├── client.ts          # createBrowserClient()
│   │   │   ├── server.ts          # createServerClient()
│   │   │   └── mappers.ts         # snake_case DB → camelCase TypeScript
│   │   ├── types.ts               # Tipos TypeScript del dominio
│   │   ├── utils.ts               # cn() y utilidades generales
│   │   ├── storage.ts             # Upload/download Supabase Storage
│   │   └── date-filters.ts        # Filtros de fecha (hoy/semana/mes)
│   │
│   ├── providers/                 # React context providers
│   │   └── SupabaseProvider.tsx   # Auth context + useSupabase() + useUser()
│   │
│   ├── services/                  # Servicios de acceso a datos (Supabase)
│   │   ├── auth.ts                # signIn, signOut, getSession
│   │   ├── users.ts               # CRUD de perfiles de usuario
│   │   ├── products.ts            # CRUD de productos
│   │   ├── orders.ts              # Órdenes/ventas
│   │   ├── inventory.ts           # Items de inventario y asignaciones
│   │   └── settlements.ts         # Liquidaciones
│   │
│   └── middleware.ts              # Protección de rutas (/dashboard)
│
├── .env                           # Variables de entorno (no commitear)
├── .env.example                   # Template de variables (commitear)
├── next.config.ts                 # Configuración Next.js
├── tailwind.config.ts             # Configuración Tailwind
├── tsconfig.json                  # Configuración TypeScript
└── package.json
```

## Convenciones

| Directorio | Responsabilidad |
|---|---|
| `app/` | Rutas, layouts, páginas — Next.js App Router |
| `app/api/` | API routes — equivalente al backend en Next.js |
| `components/ui/` | Componentes shadcn/ui — no modificar directamente |
| `components/dashboard/` | Componentes específicos del dashboard |
| `hooks/use-store.ts` | Estado global de la app — única fuente de verdad |
| `lib/supabase/` | Inicialización y mappers de Supabase |
| `providers/` | React Context providers |
| `services/` | Abstracción de queries a Supabase |
| `middleware.ts` | Guards de autenticación a nivel de request |

## Nota sobre la separación frontend/backend

Next.js App Router es un framework fullstack. El "backend" (API routes, server components, middleware) vive dentro del mismo proyecto junto con el "frontend" (components, pages). Esta es la arquitectura correcta para Next.js — intentar separar ambos en directorios raíz distintos rompe el framework.

La separación de responsabilidades se logra mediante:
- `src/services/` → lógica de acceso a datos (backend)
- `src/app/api/` → endpoints HTTP del servidor
- `src/components/` → UI pura (frontend)
- `src/hooks/` → estado del cliente
