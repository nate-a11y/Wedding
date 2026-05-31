import { supabase, isSupabaseServiceRoleConfigured } from '@/lib/supabase-server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const fallbackRateLimitMap = new Map<string, RateLimitRecord>();
let lastFallbackCleanup = 0;
let hasWarnedRpcUnavailable = false;

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

function normalizeOptions(options: RateLimitOptions): Required<RateLimitOptions> {
  return {
    windowMs: Math.max(1000, Math.floor(options.windowMs ?? 60000)),
    maxRequests: Math.max(1, Math.floor(options.maxRequests ?? 10)),
  };
}

function checkFallbackRateLimit(
  identifier: string,
  options: Required<RateLimitOptions>
): RateLimitResult {
  const now = Date.now();

  // Lazy cleanup keeps serverless runtimes from retaining an interval handle.
  if (now - lastFallbackCleanup > 60000) {
    for (const [key, record] of fallbackRateLimitMap.entries()) {
      if (now > record.resetTime) {
        fallbackRateLimitMap.delete(key);
      }
    }
    lastFallbackCleanup = now;
  }

  const record = fallbackRateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    fallbackRateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetIn: options.windowMs,
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.max(0, record.resetTime - now),
    };
  }

  record.count += 1;
  fallbackRateLimitMap.set(identifier, record);

  return {
    allowed: true,
    remaining: options.maxRequests - record.count,
    resetIn: Math.max(0, record.resetTime - now),
  };
}

function parseRpcResult(value: unknown): RateLimitResult | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const result = value as Partial<Record<keyof RateLimitResult, unknown>>;
  const allowed = result.allowed;
  const remaining = result.remaining;
  const resetIn = result.resetIn;

  if (
    typeof allowed !== 'boolean' ||
    typeof remaining !== 'number' ||
    typeof resetIn !== 'number'
  ) {
    return null;
  }

  return {
    allowed,
    remaining: Math.max(0, Math.floor(remaining)),
    resetIn: Math.max(0, Math.floor(resetIn)),
  };
}

/**
 * Server-side rate limiting.
 *
 * In production, use the Supabase service-role RPC for an atomic, shared limit
 * across serverless instances. In local/dev or if the RPC has not been applied
 * yet, fall back to a process-local limiter so the app keeps working.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const normalized = normalizeOptions(options);

  if (!supabase || !isSupabaseServiceRoleConfigured()) {
    return checkFallbackRateLimit(identifier, normalized);
  }

  try {
    const { data, error } = await supabase.rpc('check_wedding_rate_limit', {
      p_identifier: identifier,
      p_window_ms: normalized.windowMs,
      p_max_requests: normalized.maxRequests,
    });

    if (error) {
      if (!hasWarnedRpcUnavailable) {
        console.warn('Rate limit RPC unavailable; using in-memory fallback.', error.message);
        hasWarnedRpcUnavailable = true;
      }
      return checkFallbackRateLimit(identifier, normalized);
    }

    return parseRpcResult(data) ?? checkFallbackRateLimit(identifier, normalized);
  } catch (error) {
    if (!hasWarnedRpcUnavailable) {
      console.warn(
        'Rate limit RPC failed; using in-memory fallback.',
        error instanceof Error ? error.message : 'Unknown error'
      );
      hasWarnedRpcUnavailable = true;
    }
    return checkFallbackRateLimit(identifier, normalized);
  }
}
