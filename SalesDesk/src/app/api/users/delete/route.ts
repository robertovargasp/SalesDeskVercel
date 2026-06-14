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

    const check = (error: { message: string } | null, step: string) => {
      if (error) throw new Error(`${step}: ${error.message}`);
    };

    // Borrado en cascada en orden FK-seguro (las columnas seller_id en
    // inventory/kardex/assignments referencian al repartidor en este esquema).

    // 1) Eventos de orden creados por el usuario (referencian profile vía user_id)
    check((await supabaseAdmin.from('order_events').delete().eq('user_id', userId)).error, 'order_events');

    // 2) Movimientos de kardex donde participa el usuario
    check((await supabaseAdmin.from('kardex_entries').delete().or(`seller_id.eq.${userId},user_id.eq.${userId}`)).error, 'kardex_entries');

    // 3) Liquidaciones del usuario
    check((await supabaseAdmin.from('settlements').delete().eq('seller_id', userId)).error, 'settlements');

    // 4) Asignaciones de inventario (recibidas o creadas por el usuario)
    check((await supabaseAdmin.from('inventory_assignments').delete().or(`seller_id.eq.${userId},created_by.eq.${userId}`)).error, 'inventory_assignments');

    // 5) Stock del usuario
    check((await supabaseAdmin.from('inventory_items').delete().eq('seller_id', userId)).error, 'inventory_items');

    // 6) Órdenes donde es vendedor o repartidor (cascada borra order_items/order_events)
    check((await supabaseAdmin.from('orders').delete().or(`seller_id.eq.${userId},delivery_person_id.eq.${userId}`)).error, 'orders');

    // 7) Cuenta Auth → cascada borra el profile (ya sin referencias)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authDeleteError) throw new Error(`auth: ${authDeleteError.message}`);

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
