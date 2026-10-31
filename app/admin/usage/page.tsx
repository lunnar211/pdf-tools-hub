import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh, canManageUsers } from "@/lib/admin";
import { blockIp, unblockIp } from "../actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  if (!prisma) {
    return <main><h1 className="text-3xl font-extrabold">Usage &amp; abuse</h1><p role="status" className="mt-4">Database not configured yet.</p></main>;
  }
  const [perUser, failed, blocked] = await Promise.all([
    prisma.job.groupBy({ by: ["userId"], _count: true, orderBy: { _count: { userId: "desc" } }, take: 50 }),
    prisma.job.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]).catch(() => [[], [], []] as const);
  const canManage = canManageUsers(admin.adminRole);
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Usage &amp; abuse</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        IPs are stored only as hashes, never raw. Flagged uploads below show metadata only (tool, status, short
        input summary) — never file contents, which are never stored.
      </p>
      <section aria-label="Per-user usage" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Per-user usage (top 50, all time)</h2>
        {perUser.length === 0 ? <p className="mt-2 text-slate-500">No signed-in jobs yet.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {perUser.map((u) => <li key={u.userId ?? "guest"}>{u.userId ? `${u.userId.slice(0, 8)}…` : "guest"} — {u._count} jobs</li>)}
          </ul>
        )}
      </section>
      <section aria-label="Flagged uploads and failed jobs" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Flagged uploads / failed jobs (metadata only)</h2>
        {failed.length === 0 ? <p className="mt-2 text-slate-500">No failed jobs recorded.</p> : (
          <ul className="mt-2 space-y-1 text-sm">
            {failed.map((j) => <li key={j.id}>{j.tool} — {j.status} — {j.inputSummary ?? "no summary"} — {j.createdAt.toISOString().slice(0, 16)}</li>)}
          </ul>
        )}
      </section>
      <section aria-label="Blocked IPs" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Blocked IPs (hashes)</h2>
        {blocked.length === 0 ? <p className="mt-2 text-slate-500">No IPs blocked.</p> : (
          <ul className="mt-2 space-y-2 text-sm">
            {blocked.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-3">
                <span>{b.ipHash.slice(0, 16)}… {b.reason ? `— ${b.reason}` : ""} {b.expiresAt ? `(until ${b.expiresAt.toISOString().slice(0, 10)})` : ""}</span>
                {canManage && <form action={unblockIp.bind(null, b.id)}><Button variant="outline" type="submit">Unblock</Button></form>}
              </li>
            ))}
          </ul>
        )}
        {canManage ? (
          <form action={blockIp} className="mt-4 grid gap-2 sm:grid-cols-2">
            <div><label htmlFor="ip" className="block font-bold">IP address to block</label><input id="ip" name="ip" required placeholder="203.0.113.10" className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div><label htmlFor="reason" className="block font-bold">Reason</label><input id="reason" name="reason" className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div className="sm:col-span-2"><Button type="submit">Block IP</Button></div>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Blocking needs SUPER.</p>
        )}
      </section>
    </main>
  );
}
