// Per-tool gate applied before every conversion. Order:
// 1. Maintenance mode / tool switched off in SiteSetting -> 503.
// 2. Blocked IP (hashed) -> 403.
// 3. Signed-in user (DB): suspended -> 403; daily Job count vs plan quota -> 429.
// 4. Everyone else: the existing per-IP daily limit (unchanged behavior).
// DB failures fall through to the IP limit so tools never break for guests.
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, checkRateLimit, FREE_DAILY_LIMIT } from "@/lib/rate-limit";
import { errorResponse } from "@/lib/files";
import { getQuota, isToolEnabled, maintenanceMode } from "@/lib/settings";
import { countJobsToday } from "@/lib/jobs";
import { hashIp } from "@/lib/security";

export async function toolGate(req: Request, tool: string): Promise<Response | null> {
  if (await maintenanceMode()) {
    return errorResponse("PDF Tools Hub is in maintenance mode right now. Please try again shortly.", 503);
  }
  if (!(await isToolEnabled(tool))) {
    return errorResponse("This tool is switched off right now. Please try again later.", 503);
  }
  const ip = getClientIp(req);
  if (prisma) {
    try {
      const blocked = await prisma.blockedIp.findUnique({ where: { ipHash: hashIp(ip) } });
      if (blocked && (!blocked.expiresAt || blocked.expiresAt.getTime() > Date.now())) {
        return errorResponse("This address is blocked from using the tools.", 403);
      }
    } catch {
      // fall through to the IP limit
    }
  }
  let sessionUserId: string | null = null;
  let plan: "FREE" | "PREMIUM" = "FREE";
  // Without AUTH_SECRET there can be no valid session; skip auth() entirely
  // instead of logging a MissingSecret error on every guest conversion.
  try {
    const session = process.env.AUTH_SECRET ? await auth() : null;
    const email = session?.user?.email;
    if (email && prisma) {
      const dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser) {
        if (dbUser.status === "SUSPENDED") return errorResponse("This account is suspended.", 403);
        sessionUserId = dbUser.id;
        plan = dbUser.plan === "PREMIUM" ? "PREMIUM" : "FREE";
      }
    }
  } catch {
    // fall through to the IP limit
  }
  if (sessionUserId) {
    const quota = await getQuota(plan);
    const used = await countJobsToday(sessionUserId);
    if (used >= quota) {
      return errorResponse(`Daily limit reached (${quota} conversions per day for your plan). Please try again tomorrow.`, 429);
    }
    return null;
  }
  const res = await checkRateLimit(ip);
  if (!res.allowed) {
    return errorResponse(`Free daily limit reached (${FREE_DAILY_LIMIT} conversions per day). Please try again tomorrow.`, 429);
  }
  return null;
}
