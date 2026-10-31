import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  const tab = (await searchParams).tab ?? "audit";
  if (!prisma) {
    return <main><h1 className="text-3xl font-extrabold">Logs</h1><p role="status" className="mt-4">Database not configured yet.</p></main>;
  }
  const [audit, errors, webhooks] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.webhookEvent.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]).catch(() => [[], [], []] as const);
  const tabs = [
    { id: "audit", label: "Audit log", rows: audit.map((r) => `${r.createdAt.toISOString().slice(0, 16)} — ${r.action} — ${r.targetType ?? ""} ${r.targetId ?? ""} — actor ${r.actorId ?? "system"}`) },
    { id: "errors", label: "Error log", rows: errors.map((r) => `${r.createdAt.toISOString().slice(0, 16)} — ${r.source} — ${r.message} — ${r.path ?? ""}`) },
    { id: "webhooks", label: "Payment webhook log", rows: webhooks.map((r) => `${r.createdAt.toISOString().slice(0, 16)} — ${r.provider} — ${r.eventType} — ${r.eventId} — processed ${r.processedAt ? "yes" : "no"}`) },
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Logs</h1>
      <nav aria-label="Log tabs" className="mt-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <a key={t.id} href={`/admin/logs?tab=${t.id}`} className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 font-semibold dark:border-teal-900 dark:bg-slate-900">
            {t.label}
          </a>
        ))}
      </nav>
      <section aria-label={current.label} className="mt-4 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        {current.rows.length === 0 ? (
          <p role="status" className="text-slate-500">No entries yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {current.rows.map((row, i) => <li key={i}>{row}</li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
