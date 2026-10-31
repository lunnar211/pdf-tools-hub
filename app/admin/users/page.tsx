import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh, canViewUsers } from "@/lib/admin";
import { addNote } from "../actions";
import { SearchBox, UserButtons } from "./actions-ui";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 25;

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; view?: string }> }) {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  if (!canViewUsers(admin.adminRole)) {
    return <main><h1 className="text-3xl font-extrabold">Users</h1><p role="alert" className="mt-4">Your role cannot view users.</p></main>;
  }
  if (!prisma) {
    return <main><h1 className="text-3xl font-extrabold">Users</h1><p role="status" className="mt-4">Database not configured yet.</p></main>;
  }
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const where = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.user.count({ where }),
  ]).catch(() => [[], 0] as const);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const detail = params.view
    ? await prisma.user.findUnique({
        where: { id: params.view },
        include: { jobs: { orderBy: { createdAt: "desc" }, take: 20 }, notes: { orderBy: { createdAt: "desc" }, take: 20 } },
      }).catch(() => null)
    : null;
  const noteAction = detail ? addNote.bind(null, detail.id) : null;

  return (
    <main>
      <h1 className="text-3xl font-extrabold">Users</h1>
      <div className="mt-4"><SearchBox initial={q} /></div>
      {users.length === 0 ? (
        <p role="status" className="mt-4 text-slate-600 dark:text-slate-300">No users found.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border-2 border-[#99f6e4] bg-white dark:border-teal-900 dark:bg-slate-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead><tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-3 py-2"><Link href={`/admin/users?view=${u.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="underline">{u.email}</Link></td>
                  <td className="px-3 py-2">{u.plan}</td>
                  <td className="px-3 py-2">{u.status}</td>
                  <td className="px-3 py-2">{u.role}{u.adminRole ? `/${u.adminRole}` : ""}</td>
                  <td className="px-3 py-2">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2"><UserButtons userId={u.id} status={u.status} plan={u.plan} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        {page > 1 && <Link href={`/admin/users?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="underline">Previous</Link>}
        <span>Page {page} of {pages} ({total} users)</span>
        {page < pages && <Link href={`/admin/users?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="underline">Next</Link>}
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        <a href="/api/admin/users/export" className="underline">Download users as CSV</a> (admin session required).
      </p>

      {detail && (
        <section aria-label="User detail" className="mt-8 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
          <h2 className="text-xl font-bold">Profile: {detail.email}</h2>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2 text-sm">
            <div><dt className="font-semibold">Name</dt><dd>{detail.name ?? "—"}</dd></div>
            <div><dt className="font-semibold">Country</dt><dd>{detail.country ?? "—"}</dd></div>
            <div><dt className="font-semibold">Plan / status</dt><dd>{detail.plan} / {detail.status}</dd></div>
            <div><dt className="font-semibold">Age confirmed</dt><dd>{detail.ageConfirmed ? "Yes" : "No"}</dd></div>
            <div><dt className="font-semibold">Last login</dt><dd>{detail.lastLoginAt?.toISOString().slice(0, 16) ?? "—"}</dd></div>
            <div><dt className="font-semibold">Jobs shown</dt><dd>{detail.jobs.length}</dd></div>
          </dl>
          <h3 className="mt-5 font-bold">Recent jobs</h3>
          {detail.jobs.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <ul className="mt-1 space-y-1 text-sm">
              {detail.jobs.map((j) => <li key={j.id}>{j.tool} — {j.status} — {j.createdAt.toISOString().slice(0, 16)}</li>)}
            </ul>
          )}
          <h3 className="mt-5 font-bold">Internal notes</h3>
          {detail.notes.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
            <ul className="mt-1 space-y-1 text-sm">
              {detail.notes.map((n) => <li key={n.id}>{n.note} <span className="text-slate-500">({n.createdAt.toISOString().slice(0, 10)})</span></li>)}
            </ul>
          )}
          {noteAction && (
            <form action={noteAction} className="mt-4 space-y-2">
              <label htmlFor="note" className="block font-bold">Add internal note</label>
              <textarea id="note" name="note" required rows={3} className="w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" />
              <Button type="submit">Save note</Button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
