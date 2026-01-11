/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages environment bindings
 * @see https://developers.cloudflare.com/pages/functions/bindings/
 */
interface CloudflareEnv {
    // KV Namespaces (if using Cloudflare KV)
    // CACHE: KVNamespace;

    // D1 Database (if using Cloudflare D1)
    // DB: D1Database;

    // R2 Bucket (if using Cloudflare R2)
    // BUCKET: R2Bucket;

    // Durable Objects (if using Durable Objects)
    // DO: DurableObjectNamespace;

    // Service Bindings (if using Workers)
    // SERVICE: Fetcher;

    // Environment variables
    NODE_ENV: string;
    DATABASE_URL?: string;
    NEXTAUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    OPENAI_API_KEY?: string;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends CloudflareEnv {}
    }
}

export {};
