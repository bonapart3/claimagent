/**
 * ClaimAgent™ Rate Limiting
 *
 * Implements rate limiting for API protection using Cloudflare KV
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix: string; // Prefix for cache keys
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyPrefix: 'ratelimit:',
};

export class RateLimiter {
  private cache: KVNamespace;
  private config: RateLimitConfig;

  constructor(cache: KVNamespace, config: Partial<RateLimitConfig> = {}) {
    this.cache = cache;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if the client is within rate limits
   */
  async checkLimit(clientId: string): Promise<boolean> {
    const key = `${this.config.keyPrefix}${clientId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Get current rate limit data
      const data = await this.cache.get(key, 'json') as RateLimitData | null;

      if (!data) {
        // First request from this client
        await this.cache.put(
          key,
          JSON.stringify({
            count: 1,
            timestamps: [now],
            windowStart: now,
          }),
          { expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60 }
        );
        return true;
      }

      // Filter out old timestamps
      const recentTimestamps = data.timestamps.filter((ts) => ts > windowStart);

      if (recentTimestamps.length >= this.config.maxRequests) {
        // Rate limit exceeded
        return false;
      }

      // Add new timestamp and update
      recentTimestamps.push(now);
      await this.cache.put(
        key,
        JSON.stringify({
          count: recentTimestamps.length,
          timestamps: recentTimestamps,
          windowStart: recentTimestamps[0],
        }),
        { expirationTtl: Math.ceil(this.config.windowMs / 1000) + 60 }
      );

      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open to avoid blocking legitimate requests
      return true;
    }
  }

  /**
   * Get remaining requests for client
   */
  async getRemainingRequests(clientId: string): Promise<number> {
    const key = `${this.config.keyPrefix}${clientId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const data = await this.cache.get(key, 'json') as RateLimitData | null;

      if (!data) {
        return this.config.maxRequests;
      }

      const recentCount = data.timestamps.filter((ts) => ts > windowStart).length;
      return Math.max(0, this.config.maxRequests - recentCount);
    } catch {
      return this.config.maxRequests;
    }
  }

  /**
   * Get rate limit headers
   */
  async getHeaders(clientId: string): Promise<Record<string, string>> {
    const remaining = await this.getRemainingRequests(clientId);
    const resetTime = Math.ceil(Date.now() / 1000) + Math.ceil(this.config.windowMs / 1000);

    return {
      'X-RateLimit-Limit': this.config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': resetTime.toString(),
    };
  }

  /**
   * Reset rate limit for client
   */
  async reset(clientId: string): Promise<void> {
    const key = `${this.config.keyPrefix}${clientId}`;
    await this.cache.delete(key);
  }
}

interface RateLimitData {
  count: number;
  timestamps: number[];
  windowStart: number;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMIT_CONFIGS: Record<string, Partial<RateLimitConfig>> = {
  // API endpoints
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:api:',
  },

  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    keyPrefix: 'ratelimit:auth:',
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'ratelimit:upload:',
  },

  // Claim submission endpoints
  claims: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    keyPrefix: 'ratelimit:claims:',
  },

  // AI/fraud detection endpoints (expensive operations)
  ai: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'ratelimit:ai:',
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    keyPrefix: 'ratelimit:search:',
  },

  // Webhook endpoints
  webhooks: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200,
    keyPrefix: 'ratelimit:webhooks:',
  },
};

/**
 * Get rate limiter for specific endpoint type
 */
export function getRateLimiter(
  cache: KVNamespace,
  type: keyof typeof RATE_LIMIT_CONFIGS = 'api'
): RateLimiter {
  const config = RATE_LIMIT_CONFIGS[type] || RATE_LIMIT_CONFIGS.api;
  return new RateLimiter(cache, config);
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitExceededResponse(
  headers: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': headers['X-RateLimit-Reset'] || '60',
        ...headers,
      },
    }
  );
}

/**
 * Sliding window rate limiter using sorted timestamps
 */
export class SlidingWindowRateLimiter extends RateLimiter {
  /**
   * More accurate sliding window implementation
   */
  async checkLimitPrecise(clientId: string): Promise<boolean> {
    const key = `${this.config.keyPrefix}sw:${clientId}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const data = await this.cache.get(key, 'json') as SlidingWindowData | null;

      if (!data) {
        await this.cache.put(
          key,
          JSON.stringify({
            requests: [{ timestamp: now, weight: 1 }],
          }),
          { expirationTtl: Math.ceil(this.config.windowMs / 1000) * 2 }
        );
        return true;
      }

      // Calculate weighted request count
      const validRequests = data.requests.filter((r) => r.timestamp > windowStart);
      const totalWeight = validRequests.reduce((sum, r) => {
        // Requests at the edge of the window have less weight
        const age = now - r.timestamp;
        const weight = 1 - age / this.config.windowMs;
        return sum + r.weight * Math.max(0, weight);
      }, 0);

      if (totalWeight >= this.config.maxRequests) {
        return false;
      }

      // Add new request
      validRequests.push({ timestamp: now, weight: 1 });

      await this.cache.put(
        key,
        JSON.stringify({ requests: validRequests }),
        { expirationTtl: Math.ceil(this.config.windowMs / 1000) * 2 }
      );

      return true;
    } catch (error) {
      console.error('Sliding window rate limit check failed:', error);
      return true;
    }
  }
}

interface SlidingWindowData {
  requests: Array<{
    timestamp: number;
    weight: number;
  }>;
}
