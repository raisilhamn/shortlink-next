import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createRatelimit(maxRequests: number, windowMs: number) {
  const seconds = Math.max(1, Math.round(windowMs / 1000));
  const window = `${seconds} s` as unknown as Duration;

  const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (hasUpstash) {
    const redis = Redis.fromEnv();
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      analytics: true,
    });
  }

  const fallbackMap = new Map<string, { count: number; resetAt: number }>();

  return {
    async limit(key: string) {
      const now = Date.now();
      const entry = fallbackMap.get(key);

      if (!entry || now > entry.resetAt) {
        fallbackMap.set(key, { count: 1, resetAt: now + windowMs });
        return { success: true, remaining: maxRequests - 1, limit: maxRequests, reset: now + windowMs };
      }

      if (entry.count >= maxRequests) {
        return { success: false, remaining: 0, limit: maxRequests, reset: entry.resetAt };
      }

      entry.count++;
      return { success: true, remaining: maxRequests - entry.count, limit: maxRequests, reset: entry.resetAt };
    },
  };
}

const limiter = createRatelimit;

export async function rateLimit(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const result = await limiter(maxAttempts, windowMs).limit(key);
  return result.success;
}
