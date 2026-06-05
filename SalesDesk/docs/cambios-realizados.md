# Historial de Cambios — SalesDesk

## [2026-06-01] Reorganización + Migración Firebase → Supabase

### Fase 1: FASE 2 — Mejoras operacionales
- Añadido `KardexEntry` type en `src/lib/types.ts`
- Creado `src/lib/date-filters.ts` — filtros hoy/semana/mes/personalizado
- `use-store.ts` — colección kardex + `logKardex` wired en 5 mutaciones
- Dashboard reescrito con métricas reales, recharts BarChart, filtros
- Tab Kardex en `admin/inventory/page.tsx`
- Filtros de fecha en `admin/sales/page.tsx` y `admin/settlements/page.tsx`

### Fase 2: Corrección bug crítico de autenticación
- **Causa:** Query kardex usaba `where + orderBy` en campos distintos → requería índice compuesto que no existía → Firestore devolvía error → `FirebaseErrorListener` crasheaba el árbol React para todos los roles no-admin
- **Fix:** Removido `orderBy` de la query de seller en kardex → sin índice compuesto → sort en memoria

### Fase 3: Migración completa Firebase → Supabase
- Eliminada dependencia `firebase ^11.9.1`
- Eliminados todos los archivos en `src/firebase/`
- Eliminados `firestore.rules`, `.firebaserc`, `firebase.json`, etc.
- Creado `src/lib/supabase/` (client, server, mappers)
- Creado `src/providers/SupabaseProvider.tsx`
- Creado `src/middleware.ts` (protección de rutas)
- Creado `src/app/api/users/create/route.ts`
- Reescrito `src/hooks/use-store.ts` con Supabase (misma API pública)
- Reescrito `src/lib/storage.ts` con Supabase Storage
- Instalado `@supabase/supabase-js` + `@supabase/ssr`

### Fase 4: Reorganización profesional del proyecto
- Movido `SupabaseProvider.tsx` de `components/` → `providers/`
- Creado `src/services/` (auth, users, products, orders, inventory, settlements)
- Creado `docs/` con documentación completa
- Eliminados archivos Firebase residuales de raíz del proyecto
- Eliminado archivo duplicado `src/app/lib/placeholder-images.json`
- Creado `.env.example`
