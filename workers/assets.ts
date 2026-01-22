/**
 * ClaimAgent™ Static Assets Handler
 *
 * Handles serving static assets through Cloudflare Workers
 */

import type { Env } from './index';

// MIME types for static assets
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.pdf': 'application/pdf',
};

// Cache durations based on file type
const CACHE_DURATIONS: Record<string, number> = {
  '.html': 60, // 1 minute
  '.css': 31536000, // 1 year (immutable with hash)
  '.js': 31536000, // 1 year (immutable with hash)
  '.mjs': 31536000,
  '.json': 3600, // 1 hour
  '.png': 2592000, // 30 days
  '.jpg': 2592000,
  '.jpeg': 2592000,
  '.gif': 2592000,
  '.svg': 2592000,
  '.ico': 2592000,
  '.webp': 2592000,
  '.avif': 2592000,
  '.woff': 31536000, // 1 year
  '.woff2': 31536000,
  '.ttf': 31536000,
  '.eot': 31536000,
  '.otf': 31536000,
};

/**
 * Handle static asset requests
 */
export async function handleStaticAsset(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  let path = url.pathname;

  // Normalize path
  path = path.replace(/\/+/g, '/');

  // Get file extension
  const ext = getExtension(path);
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheDuration = CACHE_DURATIONS[ext] || 3600;

  // Try to get from cache first
  const cacheKey = new Request(url.toString(), request);
  const cache = caches.default;

  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // Check if it's a Next.js asset
  if (path.startsWith('/_next/')) {
    response = await handleNextAsset(path, mimeType, cacheDuration, env);
  }
  // Check for static directory
  else if (path.startsWith('/static/') || path.startsWith('/assets/')) {
    response = await handleStaticFile(path, mimeType, cacheDuration, env);
  }
  // Handle specific files
  else {
    response = await handleSpecificFile(path, mimeType, cacheDuration, env);
  }

  // Cache successful responses
  if (response.status === 200) {
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

/**
 * Handle Next.js build assets
 */
async function handleNextAsset(
  path: string,
  mimeType: string,
  cacheDuration: number,
  env: Env
): Promise<Response> {
  // In production, these would be fetched from R2 or KV
  // For now, return a placeholder or redirect to origin

  // Try to get from KV cache
  try {
    const asset = await env.CACHE.get(path, 'arrayBuffer');
    if (asset) {
      return new Response(asset, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': `public, max-age=${cacheDuration}, immutable`,
        },
      });
    }
  } catch {
    // Asset not in cache
  }

  // Return 404 if not found
  return new Response('Asset not found', { status: 404 });
}

/**
 * Handle static files from static/assets directories
 */
async function handleStaticFile(
  path: string,
  mimeType: string,
  cacheDuration: number,
  env: Env
): Promise<Response> {
  // Try to get from R2 storage
  try {
    const key = path.replace(/^\//, '');
    const object = await env.DOCUMENTS.get(key);

    if (object) {
      const headers = new Headers();
      headers.set('Content-Type', mimeType);
      headers.set('Cache-Control', `public, max-age=${cacheDuration}`);
      headers.set('ETag', object.etag);

      return new Response(object.body, { headers });
    }
  } catch {
    // File not found in R2
  }

  return new Response('File not found', { status: 404 });
}

/**
 * Handle specific files like favicon, robots.txt, etc.
 */
async function handleSpecificFile(
  path: string,
  mimeType: string,
  cacheDuration: number,
  env: Env
): Promise<Response> {
  // Handle common specific files
  switch (path) {
    case '/favicon.ico':
    case '/logo.svg':
      return generateLogoSvg();

    case '/robots.txt':
      return new Response(
        `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://claimagent.io/sitemap.xml`,
        {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
          },
        }
      );

    case '/sitemap.xml':
      return new Response(generateSitemap(), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });

    case '/manifest.webmanifest':
    case '/manifest.json':
      return new Response(
        JSON.stringify({
          name: env.APP_NAME,
          short_name: 'ClaimAgent',
          description: 'Autonomous Automotive Insurance Claims Platform',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#1e3a8a',
          icons: [
            { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml' },
          ],
        }),
        {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'public, max-age=86400',
          },
        }
      );

    default:
      return new Response('File not found', { status: 404 });
  }
}

/**
 * Generate logo SVG
 */
function generateLogoSvg(): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a"/>
      <stop offset="100%" style="stop-color:#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#grad)"/>
  <path d="M50 15 L15 35 L50 55 L85 35 Z" fill="white" opacity="0.9"/>
  <path d="M15 65 L50 85 L85 65" stroke="white" stroke-width="4" fill="none" opacity="0.7"/>
  <path d="M15 50 L50 70 L85 50" stroke="white" stroke-width="4" fill="none" opacity="0.8"/>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=2592000',
    },
  });
}

/**
 * Generate sitemap XML
 */
function generateSitemap(): string {
  const baseUrl = 'https://claimagent.io';
  const pages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/claims/dashboard', priority: '0.9', changefreq: 'daily' },
    { url: '/claims/new', priority: '0.8', changefreq: 'weekly' },
    { url: '/login', priority: '0.7', changefreq: 'monthly' },
    { url: '/privacy', priority: '0.3', changefreq: 'monthly' },
    { url: '/terms', priority: '0.3', changefreq: 'monthly' },
    { url: '/compliance', priority: '0.3', changefreq: 'monthly' },
  ];

  const urls = pages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

/**
 * Get file extension from path
 */
function getExtension(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}
