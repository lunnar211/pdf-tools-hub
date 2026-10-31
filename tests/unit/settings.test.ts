import { describe, it, expect } from "vitest";
import { getSetting, getQuota, SETTING_DEFAULTS } from "@/lib/settings";

// With DATABASE_URL unset, Prisma is null and every setting falls back to its
// documented default — the guest tools must keep working in that state.
describe("settings defaults without a database", () => {
  it("returns documented defaults", async () => {
    expect(await getSetting("guest_daily_limit")).toBe("20");
    expect(await getSetting("free_daily_limit")).toBe("100");
    expect(await getSetting("premium_daily_limit")).toBe("1000");
    expect(await getSetting("unknown_key_xyz")).toBe("");
    expect(SETTING_DEFAULTS.maintenance_mode).toBe("off");
  });
  it("quota math picks the right tier", async () => {
    expect(await getQuota("GUEST")).toBe(20);
    expect(await getQuota("FREE")).toBe(100);
    expect(await getQuota("PREMIUM")).toBe(1000);
  });
});
