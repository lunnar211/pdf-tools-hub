import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, totpFresh } from "@/lib/admin";
import { getSetting, isToolEnabled } from "@/lib/settings";
import { TOOLS } from "@/lib/site";

export const dynamic = "force-dynamic";

// Tokens & providers: STATUS BY NAME ONLY. This page renders booleans
// ("Set" / "Not set") derived from env presence — it never renders, logs,
// or transmits any key, token, secret, or connection value. Editing lives
// on /admin/settings (SUPER only); this page is the read-only status view.
function Status({ set }: { set: boolean }) {
  return set ? (
    <span className="font-semibold text-[#0f766e] dark:text-[#5eead4]">Set</span>
  ) : (
    <span className="font-semibold text-[#b45309]">Not set</span>
  );
}

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  const providers = [
    { name: "Supabase Auth (Google sign-in)", set: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), note: "Same LeadForge project as LeadsForceGen. Redirects are added in the Supabase dashboard." },
    { name: "Shared database", set: Boolean(process.env.DATABASE_URL), note: "Supabase Postgres pooler string. Without it, admin pages show honest not-configured states." },
    { name: "Paddle (payments)", set: Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_PRICE_ID), note: "Checkout is hidden until Paddle is configured. Price lives in Paddle, never here." },
    { name: "Upstash (rate limiting)", set: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN), note: "Optional. Without it, an in-memory limiter applies per server instance." },
    { name: "Turnstile (bot check)", set: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY), note: "Optional. Tools work without it." },
  ];
  const budget = await getSetting("api_budget_usd");
  const maintenance = await getSetting("maintenance_mode");
  const toolStates = await Promise.all(TOOLS.map(async (t) => ({ title: t.title, on: await isToolEnabled(t.slug) })));
  const disabledTools = toolStates.filter((t) => !t.on);
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Tokens &amp; providers</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Status by name only. No key, token, secret, or connection value is shown anywhere on this page — only
        whether each provider is configured.
      </p>
      <section aria-label="Provider status" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Providers</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead><tr><th className="py-2 pr-3">Provider</th><th className="py-2 pr-3">Status</th><th className="py-2">Note</th></tr></thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.name} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2 pr-3 font-semibold">{p.name}</td>
                  <td className="py-2 pr-3"><Status set={p.set} /></td>
                  <td className="py-2">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-label="Spend cap and kill-switches" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Spend cap &amp; kill-switches</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div><dt className="font-semibold">API budget cap (USD)</dt><dd>{budget}</dd></div>
          <div><dt className="font-semibold">Maintenance mode</dt><dd>{maintenance === "on" ? "On — tools show the maintenance notice" : "Off"}</dd></div>
          <div><dt className="font-semibold">Tools switched off</dt><dd>{disabledTools.length === 0 ? "None — every tool is on" : disabledTools.map((t) => t.title).join(", ")}</dd></div>
        </dl>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          These are edited on the <Link href="/admin/settings" className="font-semibold text-[#0f766e] underline dark:text-[#5eead4]">Settings</Link> page (SUPER only).
          Per-tool switches and the daily limits there are the kill-switches: switching a tool off removes it
          for everyone immediately.
        </p>
      </section>
    </main>
  );
}
