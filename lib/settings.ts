// SiteSetting access (DB-guarded: defaults apply when DB is unset).
// Quotas: guests keep the existing 20/day per-IP limit; logged-in FREE users
// get 100/day; PREMIUM users get 1000/day. All editable from /admin/settings.
import { prisma } from "./prisma";

export const SETTING_DEFAULTS: Record<string, string> = {
  guest_daily_limit: "20",
  free_daily_limit: "100",
  premium_daily_limit: "1000",
  maintenance_mode: "off",
  announcement_banner: "",
  ads_enabled: "on",
  api_budget_usd: "50",
};

export async function getSetting(key: string): Promise<string> {
  const fallback = SETTING_DEFAULTS[key] ?? "";
  if (!prisma) return fallback;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getQuota(plan: "FREE" | "PREMIUM" | "GUEST"): Promise<number> {
  const key =
    plan === "PREMIUM" ? "premium_daily_limit" : plan === "FREE" ? "free_daily_limit" : "guest_daily_limit";
  const raw = await getSetting(key);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : parseInt(SETTING_DEFAULTS[key], 10);
}

export async function isToolEnabled(slug: string): Promise<boolean> {
  const v = await getSetting(`tool_${slug}_enabled`);
  return v !== "off";
}

export async function maintenanceMode(): Promise<boolean> {
  return (await getSetting("maintenance_mode")) === "on";
}
