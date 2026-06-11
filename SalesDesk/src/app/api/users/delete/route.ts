import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return Response.json({ error: 'Configuración del servidor incompleta' }, { status: 503 });
  }

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

  const { data: profile, error: profileError } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) return Response.json({ error: 'Error al verificar permisos' }, { status: 500 });
  if (profile?.role !== 'admin') return Response.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { userId } = await request.json();
    if (!userId) return Response.json({ error: 'userId es requerido' }, { status: 400 });

    const supabaseAdmin = createSupabaseAdminClient(supabaseUrl, serviceKey);

    // Eliminar de Auth (profiles se borra en cascada por FK o RLS)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw new Error(authDeleteError.message);

    // Eliminar perfil explícitamente
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileDeleteError) throw new Error(profileDeleteError.message);

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
