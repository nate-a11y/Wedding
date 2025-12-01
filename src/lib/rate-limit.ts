// Simple in-memory rate limiting
// For production, use Redis or a proper rate limiting service

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number; resetIn: number } {
  const { windowMs = 60000, maxRequests = 10 } = options; // Default: 10 requests per minute
  const now = Date.now();

  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetIn: windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  // Increment count
  record.count++;
  rateLimitMap.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetIn: record.resetTime - now,
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
