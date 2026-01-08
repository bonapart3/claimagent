// src/middleware.ts
// Next.js Middleware for authentication and routing

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
];

// API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/health',
  '/api/webhooks',
];

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/settings': ['ADMIN', 'SUPERVISOR'],
  '/reports': ['ADMIN', 'SUPERVISOR', 'ADJUSTER'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Return 401 for API requests
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  // For role-protected routes, we would verify the role here
  // In production, decode JWT or fetch session from cache
  // For now, allow access and let the page/API handle authorization

  // Add user info to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-session-token', sessionToken);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};

