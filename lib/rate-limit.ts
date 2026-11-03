import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult =
  | { success: true; allowed: boolean }
  | { success: false };

let checkoutLimiter: Ratelimit | null = null;
let checkinLimiter: Ratelimit | null = null;

function createLimiter(
  limit: number,
  prefix: string,
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, "60 s"),
    prefix,
  });
}

function getCheckoutLimiter(): Ratelimit | null {
  checkoutLimiter ??= createLimiter(5, "tik-booth:checkout:start");
  return checkoutLimiter;
}

function getCheckinLimiter(): Ratelimit | null {
  checkinLimiter ??= createLimiter(60, "tik-booth:checkin:scan");
  return checkinLimiter;
}

async function limit(
  limiter: Ratelimit | null,
  key: string,
  context: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    console.error(`[lib/rate-limit:${context}] Upstash configuration is missing`);
    return { success: false };
  }

  try {
    const result = await limiter.limit(key);
    return { success: true, allowed: result.success };
  } catch (error) {
    console.error(`[lib/rate-limit:${context}] request failed`, error);
    return { success: false };
  }
}

export async function checkCheckoutRateLimit(userId: string): Promise<RateLimitResult> {
  return limit(getCheckoutLimiter(), userId, "checkout");
}

export async function checkCheckinRateLimit(accessId: string): Promise<RateLimitResult> {
  return limit(getCheckinLimiter(), accessId, "checkin");
}
