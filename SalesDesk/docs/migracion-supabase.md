# Migración Firebase → Supabase

## Estado: COMPLETADA (código listo, pendiente conectar credenciales)

## Resumen de cambios

### Eliminado (Firebase)
- `src/firebase/` — directorio completo
- `src/components/FirebaseErrorListener.tsx`
- `firestore.rules`
- `.firebaserc`
- `firebase.json`
- `firestore.indexes.json`
- `apphosting.yaml`
- Dependencia `firebase ^11.9.1`

### Creado (Supabase)
- `src/lib/supabase/client.ts` — `createBrowserClient()`
- `src/lib/supabase/server.ts` — `createServerClient()`
- `src/lib/supabase/mappers.ts` — conversión snake_case → camelCase
- `src/providers/SupabaseProvider.tsx` — contexto de auth
- `src/middleware.ts` — protección de rutas
- `src/app/api/users/create/route.ts` — creación de usuarios (service_role)
- `src/services/` — capa de servicios
- Dependencias `@supabase/supabase-js` + `@supabase/ssr`

## Para activar Supabase

### Paso 1 — Variables de entorno
Editar `.env` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### Paso 2 — Ejecutar SQL
En el SQL Editor de Supabase ejecutar los scripts en `c:\SalesDesk\supabase.md` en este orden:
1. Extensiones
2. ENUMs
3. Tablas (en el orden del documento)
4. FK circulares
5. Triggers
6. Función `get_my_role()`
7. Habilitar RLS
8. Políticas RLS
9. Storage bucket + políticas

### Paso 3 — Crear administrador inicial
En Supabase Dashboard → Authentication → Users → "Add user":
- Email: `admin@salesdesk.com`
- Password: `123456`

Luego en SQL Editor:
```sql
INSERT INTO profiles (id, name, username, email, city, role, is_active, settlement_frequency, settlement_start_day)
VALUES (
  '<uuid-del-usuario-creado>',
  'Administrador Maestro',
  'admin',
  'admin@salesdesk.com',
  'Sede Central',
  'admin',
  true,
  'weekly',
  1
);
```

### Paso 4 — Crear bucket de Storage
En Supabase Dashboard → Storage → "New bucket":
- Nombre: `salesdesk`
- Public: NO (privado)

### Paso 5 — Verificar
```bash
npm run dev
```
Ir a `http://localhost:9002` → login con `admin` / `123456`.

## Diferencias clave con Firebase

| Aspecto | Firebase | Supabase |
|---|---|---|
| Auth | `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword` |
| Realtime | `onSnapshot` | `channel().on('postgres_changes', ...)` |
| Seguridad | Firestore Rules | Row Level Security (PostgreSQL) |
| Storage | `uploadBytesResumable` | `supabase.storage.from().upload()` |
| Crear usuario | Secondary App pattern | API route con service_role |
| IDs | Custom strings | UUID v4 |
| Datos embebidos | Arrays en documentos | Tablas relacionales con JOIN |
