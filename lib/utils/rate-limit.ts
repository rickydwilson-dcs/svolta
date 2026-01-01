/**
 * Simple in-memory rate limiter for API routes
 *
 * Note: This uses in-memory storage which resets on server restart.
 * For production with multiple instances, consider using Redis or similar.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

// In-memory storage for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent Node.js from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the requester (e.g., user ID, IP address)
 * @param options - Rate limit configuration
 * @returns Object indicating if rate limited and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): {
  limited: boolean;
  remaining: number;
  resetTime: number;
} {
  // Start cleanup if not already running
  startCleanup();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or window has expired
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      limited: false,
      remaining: options.limit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // Window still active - increment count
  entry.count += 1;
  rateLimitStore.set(identifier, entry);

  const limited = entry.count > options.limit;
  const remaining = Math.max(0, options.limit - entry.count);

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Create a rate limiter with preset options
 *
 * @param options - Rate limit configuration
 * @returns Function to check rate limit for an identifier
 */
export function createRateLimiter(options: RateLimitOptions) {
  return (identifier: string) => checkRateLimit(identifier, options);
}

/**
 * Preset rate limiters for common use cases
 */
export const rateLimiters = {
  /**
   * Strict rate limit for upload endpoints
   * 10 uploads per 15 minutes per user
   */
  upload: createRateLimiter({
    limit: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }),

  /**
   * Standard rate limit for API endpoints
   * 100 requests per minute per user
   */
  api: createRateLimiter({
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  }),

  /**
   * Lenient rate limit for read operations
   * 1000 requests per minute per user
   */
  read: createRateLimiter({
    limit: 1000,
    windowMs: 60 * 1000, // 1 minute
  }),
};

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or admin override
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limit entries
 * Useful for testing
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
