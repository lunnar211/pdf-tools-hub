import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh } from "@/lib/admin";

export const dynamic = "force-dynamic";

// Database overview: READ-ONLY. Counts + recent rows from the shared
// database (the owner's existing Supabase "LeadForge" project). No edits,
// no deletes, no SQL console, no destructive action of any kind lives here.
// Sensitive columns are never selected (no password hashes, no TOTP
// secrets, no tokens). New sign-in identities are created in the Supabase
// dashboard, not here.
async function safeCount(fn: () => Promise<number>): Promise<number | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  if (!prisma) {
    return (
      <main>
        <h1 className="text-3xl font-extrabold">Database overview</h1>
        <p role="status" className="mt-4 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-4 dark:bg-orange-950">
          Database not configured yet. Table counts need the shared database (owner step: paste DATABASE_URL
          into this site&apos;s Vercel project).
        </p>
      </main>
    );
  }
  const db = prisma;
  const tables = [
    { name: "User", count: await safeCount(() => db.user.count()) },
    { name: "Job (tool uses)", count: await safeCount(() => db.job.count()) },
    { name: "Subscription", count: await safeCount(() => db.subscription.count()) },
    { name: "Payment", count: await safeCount(() => db.payment.count()) },
    { name: "Audit log", count: await safeCount(() => db.auditLog.count()) },
    { name: "Error log", count: await safeCount(() => db.errorLog.count()) },
    { name: "Site setting", count: await safeCount(() => db.siteSetting.count()) },
    { name: "Support message", count: await safeCount(() => db.supportMessage.count()) },
    { name: "Blocked IP", count: await safeCount(() => db.blockedIp.count()) },
    { name: "Expense", count: await safeCount(() => db.expense.count()) },
    { name: "Webhook event", count: await safeCount(() => db.webhookEvent.count()) },
    { name: "Account (legacy Auth.js)", count: await safeCount(() => db.account.count()) },
    { name: "Session (legacy Auth.js)", count: await safeCount(() => db.session.count()) },
  ];
  const [recentJobs, recentUsers, recentAudit, recentErrors] = await Promise.all([
    db.job.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { tool: true, status: true, createdAt: true } }).catch(() => []),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { email: true, plan: true, status: true, createdAt: true } }).catch(() => []),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { action: true, targetType: true, createdAt: true } }).catch(() => []),
    db.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, select: { source: true, message: true, createdAt: true } }).catch(() => []),
  ]);
  const fmt = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Database overview</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Read-only view of the shared database. Nothing here can edit or delete data, and there is no SQL
        console. Counts are live; a dash means that table could not be counted right now.
      </p>
      <section aria-label="Table row counts" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Tables</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead><tr><th className="py-2 pr-3">Table</th><th className="py-2">Rows</th></tr></thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.name} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-2 pr-3">{t.name}</td>
                  <td className="py-2">{t.count ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-label="Recent tool uses" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Recent tool uses</h2>
        {recentJobs.length === 0 ? <p className="mt-2 text-slate-600 dark:text-slate-300">None recorded yet.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {recentJobs.map((j, i) => <li key={i}>{j.tool} — {j.status} — {fmt(j.createdAt)}</li>)}
          </ul>
        )}
      </section>
      <section aria-label="Recent users" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Recent users</h2>
        {recentUsers.length === 0 ? <p className="mt-2 text-slate-600 dark:text-slate-300">None recorded yet.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {recentUsers.map((u, i) => <li key={i}>{u.email} — {u.plan} / {u.status} — {fmt(u.createdAt)}</li>)}
          </ul>
        )}
      </section>
      <section aria-label="Recent admin actions" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Recent admin actions</h2>
        {recentAudit.length === 0 ? <p className="mt-2 text-slate-600 dark:text-slate-300">None recorded yet.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {recentAudit.map((a, i) => <li key={i}>{a.action} — {a.targetType ?? ""} — {fmt(a.createdAt)}</li>)}
          </ul>
        )}
      </section>
      <section aria-label="Recent errors" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Recent errors</h2>
        {recentErrors.length === 0 ? <p className="mt-2 text-slate-600 dark:text-slate-300">None recorded yet.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {recentErrors.map((e, i) => <li key={i}>{e.source}: {e.message} — {fmt(e.createdAt)}</li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
