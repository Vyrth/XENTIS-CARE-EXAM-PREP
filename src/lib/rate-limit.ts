/**
 * In-memory rate limiter for AI endpoints.
 * For production at scale, use Redis (e.g. Upstash).
 */

const windowMs = 60 * 1000; // 1 minute
const limits = {
  free: parseInt(process.env.RATE_LIMIT_AI_FREE ?? "20", 10),
  paid: parseInt(process.env.RATE_LIMIT_AI_PAID ?? "100", 10),
};

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(userId: string): string {
  const min = Math.floor(Date.now() / windowMs);
  return `${userId}:${min}`;
}

export function checkRateLimit(
  userId: string | undefined,
  isPaid: boolean
): { allowed: boolean; limit: number; remaining: number; retryAfter?: number } {
  const limit = isPaid ? limits.paid : limits.free;

  if (!userId) {
    return { allowed: true, limit, remaining: limit };
  }

  const key = getKey(userId);
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;

  // Prune old entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of store.entries()) {
      if (now > v.resetAt) store.delete(k);
    }
  }

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    limit,
    remaining,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}
