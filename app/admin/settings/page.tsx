import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh, canEditSettings } from "@/lib/admin";
import { getSetting, SETTING_DEFAULTS } from "@/lib/settings";
import { saveSettings } from "../actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "guest_daily_limit", label: "Guest daily limit (per IP)", hint: "Existing free tier default is 20." },
  { key: "free_daily_limit", label: "Signed-in FREE daily limit", hint: "Default 100." },
  { key: "premium_daily_limit", label: "PREMIUM daily limit", hint: "Default 1000." },
  { key: "maintenance_mode", label: "Maintenance mode (on/off)", hint: "When on, every tool answers 503." },
  { key: "announcement_banner", label: "Announcement banner text", hint: "Empty = no banner." },
  { key: "ads_enabled", label: "Ads enabled (on/off)", hint: "Ads still need consent + AdSense approval." },
  { key: "api_budget_usd", label: "Budget for cost alerts (USD, trailing 30 days)", hint: "Default 50." },
  { key: "tool_pdf-to-word_enabled", label: "PDF to Word (on/off)", hint: "" },
  { key: "tool_word-to-pdf_enabled", label: "Word to PDF (on/off)", hint: "" },
  { key: "tool_image-to-pdf_enabled", label: "Image to PDF (on/off)", hint: "" },
  { key: "tool_merge-pdf_enabled", label: "Merge PDF (on/off)", hint: "" },
  { key: "tool_split-pdf_enabled", label: "Split PDF (on/off)", hint: "" },
  { key: "tool_compress-pdf_enabled", label: "Compress PDF (on/off)", hint: "" },
];

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  if (!canEditSettings(admin.adminRole)) {
    return <main><h1 className="text-3xl font-extrabold">Settings</h1><p role="alert" className="mt-4">Settings need SUPER. Your role is view-only here.</p></main>;
  }
  if (!prisma) {
    return <main><h1 className="text-3xl font-extrabold">Settings</h1><p role="status" className="mt-4">Database not configured yet.</p></main>;
  }
  const values: Record<string, string> = {};
  for (const f of FIELDS) values[f.key] = await getSetting(f.key);
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Content &amp; settings</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Plans and prices are set in Paddle (the price lives there); this page controls limits, tool availability,
        banners, and ads. Defaults are shown when a setting has never been saved.
      </p>
      <form action={saveSettings} className="mt-6 space-y-4 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="block font-bold">{f.label}</label>
            <input
              id={f.key}
              name={f.key}
              defaultValue={values[f.key] || SETTING_DEFAULTS[f.key] || ""}
              className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800"
            />
            {f.hint && <p className="text-sm text-slate-500 dark:text-slate-400">{f.hint}</p>}
          </div>
        ))}
        <Button type="submit">Save settings</Button>
      </form>
    </main>
  );
}
