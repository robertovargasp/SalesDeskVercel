import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return Response.json({ error: 'Configuración del servidor incompleta' }, { status: 503 });
  }

  // Anti-CSRF: rechazar si el Origin no coincide con el host del request
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && new URL(origin).host !== host) {
    return Response.json({ error: 'Origen no permitido' }, { status: 403 });
  }

  // Rate limiting por IP (no-op si Upstash no está configurado)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous';
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return Response.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
  }

  // Verificar que el request viene de un admin autenticado (server-side)
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Verificar rol admin en DB — no confiar en el cliente
  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) return Response.json({ error: 'Error al verificar permisos' }, { status: 500 });
  if (profile?.role !== 'admin') return Response.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'email y password son requeridos' }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Cliente admin con service_role — solo se usa después de verificar que el caller es admin
    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceKey);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ id: data.user.id });
  } catch {
    return Response.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
