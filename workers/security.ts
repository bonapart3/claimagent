/**
 * ClaimAgent™ Security Headers and Middleware
 *
 * Applies security headers and handles security-related operations
 */

import type { Env } from './index';

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);

  // Strict Transport Security
  headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy browsers)
  headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // DNS Prefetch Control
  headers.set('X-DNS-Prefetch-Control', 'on');

  // Permissions Policy (formerly Feature Policy)
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(self), interest-cohort=()'
  );

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://api.openai.com https://*.claimagent.io ${env.API_BASE_URL}`,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join('; ');

  headers.set('Content-Security-Policy', csp);

  // Cross-Origin policies
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

  // Remove server identification
  headers.delete('Server');
  headers.delete('X-Powered-By');

  // Add custom headers
  headers.set('X-App-Version', env.APP_VERSION);
  headers.set('X-Environment', env.ENVIRONMENT);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Validate CORS request
 */
export function validateCors(request: Request, env: Env): Headers {
  const origin = request.headers.get('Origin');
  const headers = new Headers();

  // Allowed origins
  const allowedOrigins = [
    'https://claimagent.io',
    'https://app.claimagent.io',
    'https://www.claimagent.io',
    'http://localhost:3000', // Development
  ];

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-Claim-ID'
    );
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400');
  }

  return headers;
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(request: Request, env: Env): Response {
  const headers = validateCors(request, env);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Validate request authentication
 */
export async function validateAuth(
  request: Request,
  env: Env
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { valid: false, error: 'No authorization header' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Invalid authorization format' };
  }

  const token = authHeader.slice(7);

  try {
    // Check session in KV
    const session = (await env.SESSIONS.get(token, 'json')) as {
      userId: string;
      expiresAt: number;
    } | null;

    if (!session) {
      return { valid: false, error: 'Invalid session' };
    }

    if (session.expiresAt < Date.now()) {
      await env.SESSIONS.delete(token);
      return { valid: false, error: 'Session expired' };
    }

    return { valid: true, userId: session.userId };
  } catch (error) {
    return { valid: false, error: 'Authentication failed' };
  }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return input.replace(/[&<>"'`=/]/g, (s) => map[s]);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash sensitive data
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(request: Request, expectedToken: string): boolean {
  const token =
    request.headers.get('X-CSRF-Token') ||
    new URL(request.url).searchParams.get('csrf_token');

  return token === expectedToken;
}

/**
 * Check if IP is blocked
 */
export async function isIpBlocked(ip: string, env: Env): Promise<boolean> {
  try {
    const blocked = await env.CACHE.get(`blocked:${ip}`);
    return blocked !== null;
  } catch {
    return false;
  }
}

/**
 * Block an IP address
 */
export async function blockIp(
  ip: string,
  env: Env,
  durationSeconds: number = 3600
): Promise<void> {
  await env.CACHE.put(`blocked:${ip}`, 'true', {
    expirationTtl: durationSeconds,
  });
}

/**
 * Log security event
 */
export async function logSecurityEvent(
  event: {
    type: string;
    ip: string;
    userId?: string;
    details?: Record<string, unknown>;
  },
  env: Env
): Promise<void> {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT,
  };

  console.log('Security Event:', JSON.stringify(logEntry));

  // In production, you might want to store this in D1 or send to a logging service
  try {
    await env.DB.prepare(
      `INSERT INTO security_logs (type, ip, user_id, details, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
      .bind(event.type, event.ip, event.userId || null, JSON.stringify(event.details || {}))
      .run();
  } catch {
    // Logging should not break the request
  }
}
