// Real usage numbers for the free-limit counter and for browser-side tools.
// Limits are per USER, not per tool: guests share the per-IP daily limit,
// signed-in FREE users get the free quota, PREMIUM users get the premium
// quota (reported as unlimited here because premium is never hard-blocked
// by the counter — the gate still enforces the premium quota server-side).
// peekUsage NEVER consumes quota; countUsage runs the full tool gate and
// consumes exactly one unit (IP increment for guests, Job row for
// signed-in users) so browser conversions count against the same limits as
// server conversions.
import { getCurrentUser } from "@/lib/supabase/server";
import { getClientIp, peekRateLimit, FREE_DAILY_LIMIT } from "@/lib/rate-limit";
import { getQuota } from "@/lib/settings";
import { countJobsToday, recordCurrentUserJob } from "@/lib/jobs";
import { toolGate } from "@/lib/tool-gate";

export type UsageInfo = {
  plan: "guest" | "free" | "premium";
  quota: number;
  used: number;
  /** null for premium: the counter shows "Premium" instead of a number. */
  remaining: number | null;
};

export async function peekUsage(req: Request): Promise<UsageInfo> {
  try {
    const { dbUser } = await getCurrentUser();
    if (dbUser) {
      const premium = dbUser.plan === "PREMIUM";
      const quota = await getQuota(premium ? "PREMIUM" : "FREE");
      const used = await countJobsToday(dbUser.id);
      return {
        plan: premium ? "premium" : "free",
        quota,
        used,
        remaining: premium ? null : Math.max(0, quota - used),
      };
    }
  } catch {
    // fall through to the guest IP limit
  }
  const ip = getClientIp(req);
  const { remaining } = await peekRateLimit(ip);
  return { plan: "guest", quota: FREE_DAILY_LIMIT, used: FREE_DAILY_LIMIT - remaining, remaining };
}

/**
 * Run the full gate for a browser conversion and consume one unit.
 * Returns the gate's error Response when blocked (caller returns it as-is),
 * otherwise the fresh usage numbers.
 */
export async function countUsage(
  req: Request,
  tool: string,
): Promise<{ blocked: Response | null; info: UsageInfo }> {
  const blocked = await toolGate(req, tool);
  if (blocked) return { blocked, info: await peekUsage(req) };
  // Gate passed. Guests were already counted by toolGate's IP check;
  // signed-in users get one Job row (this is what countJobsToday counts).
  await recordCurrentUserJob(tool, "SUCCESS");
  return { blocked: null, info: await peekUsage(req) };
}
