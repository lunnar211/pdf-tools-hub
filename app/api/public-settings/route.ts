import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Public, non-sensitive settings only: announcement banner + ads toggle.
// Never expose quotas, secrets, or anything admin-only here.
export async function GET() {
  const [announcement, adsEnabled] = await Promise.all([
    getSetting("announcement_banner"),
    getSetting("ads_enabled"),
  ]);
  return Response.json({ announcement, adsEnabled: adsEnabled !== "off" });
}
