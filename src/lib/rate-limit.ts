import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

interface Limiter {
  limit(key: string): Promise<{ success: boolean }>;
}

const hasUpstash = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstash ? Redis.fromEnv() : null;

// One limiter (and one fallback window map) per distinct maxRequests/windowMs
// config, shared across requests. Creating these per call would reset the
// in-memory counters on every request and never limit anything.
const limiters = new Map<string, Limiter>();

// Shared in-memory fallback for local dev / missing Upstash config.
// Not suitable for multi-instance deployments.
const fallbackWindows = new Map<string, { count: number; resetAt: number }>();

function pruneExpired(now: number) {
  if (fallbackWindows.size < 10_000) return;
  for (const [key, entry] of fallbackWindows) {
    if (now > entry.resetAt) fallbackWindows.delete(key);
  }
}

function createLimiter(maxRequests: number, windowMs: number): Limiter {
  if (redis) {
    const seconds = Math.max(1, Math.round(windowMs / 1000));
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${seconds} s` as Duration),
      prefix: `ratelimit:${maxRequests}:${seconds}`,
      analytics: true,
    });
  }

  return {
    async limit(key: string) {
      const now = Date.now();
      pruneExpired(now);
      const entry = fallbackWindows.get(key);

      if (!entry || now > entry.resetAt) {
        fallbackWindows.set(key, { count: 1, resetAt: now + windowMs });
        return { success: true };
      }

      if (entry.count >= maxRequests) {
        return { success: false };
      }

      entry.count++;
      return { success: true };
    },
  };
}

export async function rateLimit(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const configKey = `${maxAttempts}:${windowMs}`;
  let limiter = limiters.get(configKey);
  if (!limiter) {
    limiter = createLimiter(maxAttempts, windowMs);
    limiters.set(configKey, limiter);
  }
  const result = await limiter.limit(`${configKey}:${key}`);
  return result.success;
}
