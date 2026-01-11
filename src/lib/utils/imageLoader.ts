'use client';

interface ImageLoaderParams {
    src: string;
    width: number;
    quality?: number;
}

/**
 * Custom image loader for Cloudflare Pages deployment.
 * Uses Cloudflare Image Resizing when available, falls back to original URL.
 *
 * @see https://developers.cloudflare.com/images/image-resizing/
 */
export default function cloudflareImageLoader({
    src,
    width,
    quality = 75,
}: ImageLoaderParams): string {
    // Return original source for data URLs and SVGs
    if (src.startsWith('data:') || src.endsWith('.svg')) {
        return src;
    }

    // Handle relative URLs
    if (src.startsWith('/')) {
        return src;
    }

    // For external URLs, use Cloudflare Image Resizing if available
    // Format: /cdn-cgi/image/width=WIDTH,quality=QUALITY/URL
    try {
        const url = new URL(src);

        // Check if we're on a Cloudflare-enabled domain
        if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
            return `/cdn-cgi/image/width=${width},quality=${quality},format=auto/${src}`;
        }

        // For production domains with Cloudflare proxy enabled
        if (process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ENABLED === 'true') {
            return `/cdn-cgi/image/width=${width},quality=${quality},format=auto/${src}`;
        }

        // Fallback: return original URL with width parameter if supported
        return src;
    } catch {
        // If URL parsing fails, return original source
        return src;
    }
}
