import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh } from "@/lib/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function startOf(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-32 shrink-0 truncate">{label}</span>
      <svg width="160" height="14" role="img" aria-label={`${label}: ${value}`}>
        <rect width="160" height="14" rx="4" fill="#e2e8f0" />
        <rect width={(w * 160) / 100} height="14" rx="4" fill="#0d9488" />
      </svg>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  if (!prisma) {
    return (
      <main>
        <h1 className="text-3xl font-extrabold">Admin dashboard</h1>
        <p role="status" className="mt-4 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-4 dark:bg-orange-950">
          Database not configured yet. Admin statistics need the shared database (owner step: paste DATABASE_URL
          into this site&apos;s Vercel project).
        </p>
      </main>
    );
  }
  const [totalUsers, todayUsers, weekUsers, monthUsers, activeUsers, failedJobs, errors, byTool, byCountry] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOf(0) } } }),
      prisma.user.count({ where: { createdAt: { gte: startOf(6) } } }),
      prisma.user.count({ where: { createdAt: { gte: startOf(29) } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: startOf(29) } } }),
      prisma.job.count({ where: { status: "FAILED" } }),
      prisma.errorLog.count(),
      prisma.job.groupBy({ by: ["tool"], _count: true, orderBy: { _count: { tool: "desc" } } }),
      prisma.user.groupBy({ by: ["country"], _count: true, orderBy: { _count: { country: "desc" } }, take: 10 }),
    ]).catch(() => [0, 0, 0, 0, 0, 0, 0, [], []] as const);
  const maxTool = Math.max(0, ...byTool.map((t) => t._count));
  const cards = [
    ["Total users", totalUsers],
    ["New users today", todayUsers],
    ["New users this week", weekUsers],
    ["New users this month", monthUsers],
    ["Active users (30d)", activeUsers],
    ["Failed jobs", failedJobs],
    ["API / server errors", errors],
  ] as const;
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Admin dashboard</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Keyboard: press <kbd>/</kbd> on the Users page to focus search. Admin actions are recorded in the audit log.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border-2 border-[#99f6e4] bg-white p-4 dark:border-teal-900 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <section aria-label="Usage per tool" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Usage per tool</h2>
        {byTool.length === 0 ? (
          <p className="mt-2 text-slate-600 dark:text-slate-300">No jobs recorded yet.</p>
        ) : (
          <div className="mt-3 space-y-2">{byTool.map((t) => <Bar key={t.tool} label={t.tool} value={t._count} max={maxTool} />)}</div>
        )}
      </section>
      <section aria-label="Top countries" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Top countries</h2>
        {byCountry.length === 0 ? (
          <p className="mt-2 text-slate-600 dark:text-slate-300">No country data yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {byCountry.map((c) => (
              <li key={c.country ?? "unknown"}>{c.country ?? "Not set"} — {c._count}</li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
