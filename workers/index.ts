/**
 * ClaimAgent™ Cloudflare Worker Entry Point
 *
 * This worker serves the UI and handles API routing for the
 * Autonomous Automotive Insurance Claims Platform.
 */

import { handleRequest } from './handler';
import { handleApiRequest } from './api';
import { handleStaticAsset } from './assets';
import { applySecurityHeaders } from './security';
import { RateLimiter } from './rateLimit';

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  CACHE: KVNamespace;
  SESSIONS: KVNamespace;

  // R2 Storage
  DOCUMENTS: R2Bucket;
  UPLOADS: R2Bucket;

  // Environment variables
  APP_NAME: string;
  APP_VERSION: string;
  API_BASE_URL: string;
  ENVIRONMENT: string;

  // Secrets (set via wrangler secret)
  JWT_SECRET?: string;
  OPENAI_API_KEY?: string;
  DATABASE_URL?: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Apply rate limiting
      const rateLimiter = new RateLimiter(env.CACHE);
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const isAllowed = await rateLimiter.checkLimit(clientIP);

      if (!isAllowed) {
        return applySecurityHeaders(
          new Response(JSON.stringify({ error: 'Too many requests' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          }),
          env
        );
      }

      // Route handling
      let response: Response;

      // API routes
      if (path.startsWith('/api/')) {
        response = await handleApiRequest(request, env, ctx);
      }
      // Static assets (CSS, JS, images, fonts)
      else if (isStaticAsset(path)) {
        response = await handleStaticAsset(request, env, ctx);
      }
      // UI routes - serve the application
      else {
        response = await handleRequest(request, env, ctx);
      }

      // Apply security headers to all responses
      return applySecurityHeaders(response, env);
    } catch (error) {
      console.error('Worker error:', error);

      return applySecurityHeaders(
        new Response(
          renderErrorPage(error instanceof Error ? error.message : 'Internal Server Error'),
          {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          }
        ),
        env
      );
    }
  },

  // Scheduled event handler for background tasks
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`Scheduled event triggered at ${event.scheduledTime}`);

    // Cleanup expired sessions
    ctx.waitUntil(cleanupExpiredSessions(env));

    // Process pending claims
    ctx.waitUntil(processPendingClaims(env));
  },
};

/**
 * Check if the path is a static asset
 */
function isStaticAsset(path: string): boolean {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.webp', '.avif', '.json',
    '.map', '.txt', '.xml', '.webmanifest'
  ];

  return staticExtensions.some(ext => path.endsWith(ext)) ||
    path.startsWith('/_next/') ||
    path.startsWith('/static/') ||
    path.startsWith('/assets/');
}

/**
 * Render error page HTML
 */
function renderErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - ClaimAgent™</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 500px;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 1.5rem;
      background: rgba(255,255,255,0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      margin-right: auto;
    }
    .logo svg { width: 48px; height: 48px; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { opacity: 0.9; margin-bottom: 1.5rem; line-height: 1.6; }
    a {
      display: inline-block;
      background: white;
      color: #1e3a8a;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    a:hover { transform: translateY(-2px); }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="white">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </div>
    <h1>Something went wrong</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/">Return to Dashboard</a>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Cleanup expired sessions from KV
 */
async function cleanupExpiredSessions(env: Env): Promise<void> {
  try {
    const list = await env.SESSIONS.list();
    const now = Date.now();

    for (const key of list.keys) {
      const session = await env.SESSIONS.get(key.name, 'json') as { expiresAt?: number } | null;
      if (session?.expiresAt && session.expiresAt < now) {
        await env.SESSIONS.delete(key.name);
      }
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

/**
 * Process pending claims in background
 */
async function processPendingClaims(env: Env): Promise<void> {
  try {
    // Query pending claims from D1
    const result = await env.DB.prepare(
      'SELECT id FROM claims WHERE status = ? AND updated_at < datetime("now", "-1 hour") LIMIT 10'
    ).bind('pending').all();

    console.log(`Found ${result.results?.length || 0} pending claims to process`);
  } catch (error) {
    console.error('Pending claims processing error:', error);
  }
}
