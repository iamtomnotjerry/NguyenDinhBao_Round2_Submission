/**
 * In-memory sliding-window rate limiter for Route Handlers.
 *
 * Scope: đủ cho single-instance deployment (assessment sandbox). Với
 * multi-instance production, thay backing store bằng Redis/Upstash —
 * interface `checkRateLimit` giữ nguyên nên call sites không đổi.
 */

export interface RateLimitOptions {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** key -> sorted request timestamps (ms) within the current window */
const buckets = new Map<string, number[]>();

/** Prune dead keys occasionally so the Map cannot grow unbounded. */
const CLEANUP_EVERY = 500;
let opsSinceCleanup = 0;

function cleanup(now: number, windowMs: number) {
  for (const [key, timestamps] of buckets) {
    const alive = timestamps.filter((ts) => ts > now - windowMs);
    if (alive.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, alive);
    }
  }
}

/**
 * Sliding-window check. Records the request when allowed.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  opsSinceCleanup += 1;
  if (opsSinceCleanup >= CLEANUP_EVERY) {
    opsSinceCleanup = 0;
    cleanup(now, options.windowMs);
  }

  const windowStart = now - options.windowMs;
  const timestamps = (buckets.get(key) ?? []).filter((ts) => ts > windowStart);

  if (timestamps.length >= options.limit) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + options.windowMs - now) / 1000));
    buckets.set(key, timestamps);
    return { ok: false, retryAfterSeconds };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { ok: true };
}

/** Best-effort client IP behind common proxies (Vercel/nginx). */
export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() || null;
}

/** Test-only: reset state between test cases. */
export function _resetRateLimiterForTests() {
  buckets.clear();
  opsSinceCleanup = 0;
}
