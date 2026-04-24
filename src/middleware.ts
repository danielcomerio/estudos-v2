import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path except:
     *   - _next/static, _next/image, favicon.ico
     *   - image assets (svg, png, jpg, jpeg, gif, webp, ico)
     *   - api routes (handled per-route with their own auth checks)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
