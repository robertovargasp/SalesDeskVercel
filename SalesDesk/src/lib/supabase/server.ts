import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// CREDENCIALES SUPABASE — pegar en .env.local:
// NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll se llama desde Server Component — se puede ignorar
          }
        },
      },
    }
  );
}
