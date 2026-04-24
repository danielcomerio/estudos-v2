import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

// Routes visible without a session. /auth/callback must stay public because
// that's where the magic-link / OAuth handshake lands the unauthed user and
// exchanges the code for a session.
const PUBLIC_ROUTES = new Set(['/login', '/signup', '/auth/callback']);
// Public prefixes (anyone can read without being logged in).
const PUBLIC_PREFIXES = ['/u/'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = isPublicPath(pathname);

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Round-trip the originally requested path so we can send the user back
    // after login (handled server-side in the login success flow later).
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authed users hitting /login or /signup go to /dashboard. /auth/callback
  // is exempt because it needs to run its exchange logic even for an authed
  // tab (e.g. reusing a magic link).
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
