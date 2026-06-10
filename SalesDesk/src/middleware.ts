import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// CREDENCIALES SUPABASE — pegar en .env.local:
// NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
// NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refrescar sesión sin exponer el token
  const { data: { user } } = await supabase.auth.getUser();

  // Proteger rutas del dashboard
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    supabaseResponse.cookies.delete('x-user-role');
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protección por rol — excluir rutas /api/* (tienen validación propia server-side)
  const { pathname } = request.nextUrl;
  if (user && !pathname.startsWith('/api/')) {
    try {
      // Usar rol cacheado en cookie para evitar query a DB en cada request
      const cachedRole = request.cookies.get('x-user-role')?.value ?? null;
      let userRole = cachedRole;

      if (!userRole) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles').select('role').eq('id', user.id).single();
        if (profileError) throw profileError;
        userRole = profile?.role ?? null;
        supabaseResponse.cookies.set('x-user-role', userRole ?? '', {
          httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 8,
        });
      }

      if (pathname.startsWith('/dashboard/admin') && userRole !== 'admin')
        return NextResponse.redirect(new URL('/dashboard', request.url));
      if (pathname.startsWith('/dashboard/seller') && userRole !== 'seller')
        return NextResponse.redirect(new URL('/dashboard', request.url));
      if (pathname.startsWith('/dashboard/delivery') && userRole !== 'delivery')
        return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Redirigir al dashboard si ya está autenticado y trata de ir al login
  if (user && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
