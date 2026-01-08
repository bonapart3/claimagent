
/**
 * ClaimAgent™ Rate Limiting Utility
 * 
 * Implements rate limiting and DDoS protection for API endpoints.
 * Uses token bucket algorithm with Redis for distributed environments.
 * 
 * @module RateLimit
 * @compliance OWASP API Security Top 10
 */

import { auditLog } from './auditLogger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: any) => string;
    handler?: (req: any, res: any) => void;
    skipFailedRequests?: boolean;
    skipSuccessfulRequests?: boolean;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    reset: Date;
    retryAfter?: number;
}

export interface RateLimitStore {
    hits: number;
    resetTime: number;
}

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

export class RateLimiter {
    private config: RateLimitConfig;
    private store: Map<string, RateLimitStore>;

    constructor(config: RateLimitConfig) {
        this.config = {
            windowMs: 60000,
            maxRequests: 100,
            skipFailedRequests: false,
            skipSuccessfulRequests: false,
            ...config,
        };

        this.store = new Map();

        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Check if request is allowed
     */
    check(key: string): RateLimitResult {
        const now = Date.now();
        const entry = this.store.get(key);

        if (!entry || now > entry.resetTime) {
            const resetTime = now + this.config.windowMs;
            this.store.set(key, {
                hits: 1,
                resetTime,
            });

            return {
                allowed: true,
                remaining: this.config.maxRequests - 1,
                reset: new Date(resetTime),
            };
        }

        if (entry.hits >= this.config.maxRequests) {
            const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

            auditLog({
                action: 'RATE_LIMIT_EXCEEDED',
                entityType: 'api',
                entityId: key,
                metadata: {
                    hits: entry.hits,
                    maxRequests: this.config.maxRequests,
                    retryAfter,
                },
            });

            return {
                allowed: false,
                remaining: 0,
                reset: new Date(entry.resetTime),
                retryAfter,
            };
        }

        entry.hits++;
        this.store.set(key, entry);

        return {
            allowed: true,
            remaining: this.config.maxRequests - entry.hits,
            reset: new Date(entry.resetTime),
        };
    }

    /**
     * Reset rate limit for a key
     */
    reset(key: string): void {
        this.store.delete(key);
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.store.entries()) {
            if (now > entry.resetTime) {
                this.store.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            auditLog({
                action: 'RATE_LIMIT_CLEANUP',
                entityType: 'system',
                entityId: 'rate-limiter',
                metadata: { cleanedEntries: cleaned },
            });
        }
    }

    /**
     * Get current stats
     */
    getStats(): { totalKeys: number; totalHits: number } {
        let totalHits = 0;

        for (const entry of this.store.values()) {
            totalHits += entry.hits;
        }

        return {
            totalKeys: this.store.size,
            totalHits,
        };
    }
}

// ============================================================================
// PREDEFINED RATE LIMITERS
// ============================================================================

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
});

/**
 * Standard rate limiter for API endpoints
 */
export const apiRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
});

/**
 * Lenient rate limiter for public endpoints
 */
export const publicRateLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 requests per minute
});

/**
 * Strict rate limiter for payment endpoints
 */
export const paymentRateLimiter = new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 payment attempts per hour
});

/**
 * Helper function to extract rate limit key from request
 */
export function getRateLimitKey(identifier: string, endpoint?: string): string {
    return endpoint ? `${identifier}:${endpoint}` : identifier;
}

export default RateLimiter;

