import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Server-side gate for private areas (runs before the page renders).
 *
 * This is an *authentication* check only: it verifies the Supabase session
 * token and refreshes it if needed. It deliberately makes no database calls
 * (see Next's proxy guidance). *Authorization* — which rows an admin, driver
 * or student may read or change — is enforced by Postgres RLS, and each
 * dashboard still checks the user's role on the client as a fallback.
 */

const PUBLIC_PATHS = new Set([
  '/admin/login',
  '/admin/reset-password',
  '/driver/login',
  '/driver/reset-password',
]);

function loginPathFor(pathname: string) {
  if (pathname.startsWith('/admin')) return '/admin/login';
  if (pathname.startsWith('/driver')) return '/driver/login';
  return '/auth/login';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Misconfigured deployment: let the page's own checks handle it rather
  // than locking every user out.
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Pass refreshed tokens to the page and back to the browser.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Verifies the JWT signature (locally with asymmetric keys, otherwise via
  // the Auth server). Never trust the unverified session in the cookie.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !error && Boolean(data?.claims?.sub);

  if (!signedIn) {
    const redirect = NextResponse.redirect(new URL(loginPathFor(pathname), request.url));
    redirect.headers.set('Cache-Control', 'no-store');
    return redirect;
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*', '/driver/:path*'],
};
