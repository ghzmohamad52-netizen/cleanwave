import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function makeLimiter(tokens: number, window: `${number} s` | `${number} m`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
  });
}

export const otpLimiter = makeLimiter(3, "10 m");
export const apiLimiter = makeLimiter(60, "1 m");
export const whatsappLimiter = makeLimiter(30, "1 m");

export async function checkLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ success: boolean; remaining: number }> {
  if (!limiter) return { success: true, remaining: 999 };
  const { success, remaining } = await limiter.limit(identifier);
  return { success, remaining };
}
