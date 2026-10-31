// Free tier: 20 conversions per day per IP.
// Upstash Redis is used ONLY when both env vars are set; otherwise an
// in-memory per-IP fallback is used. The fallback does not persist across
// serverless instances or restarts -- see README.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const FREE_DAILY_LIMIT = 20;

const mem = new Map<string, { count: number; resetAt: number }>();

function memoryCheck(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = mem.get(ip);
  if (!entry || now >= entry.resetAt) {
    mem.set(ip, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
    return { allowed: true, remaining: FREE_DAILY_LIMIT - 1 };
  }
  if (entry.count >= FREE_DAILY_LIMIT) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: FREE_DAILY_LIMIT - entry.count };
}

let limiter: Ratelimit | null = null;
function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(FREE_DAILY_LIMIT, "1 d"),
      prefix: "pdf-tools-hub",
    });
  } catch {
    return null;
  }
  return limiter;
}

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const rl = getLimiter();
  if (!rl) return memoryCheck(ip);
  try {
    const res = await rl.limit(ip);
    return { allowed: res.success, remaining: res.remaining };
  } catch {
    return memoryCheck(ip);
  }
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
