import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession, totpFresh, canViewMoney, canEditMoney } from "@/lib/admin";
import { getSetting } from "@/lib/settings";
import { addExpense, deleteExpense } from "../actions";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

function startOf(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  if (!totpFresh(admin.totpVerifiedAt)) redirect("/admin/verify-2fa");
  if (!canViewMoney(admin.adminRole)) {
    return <main><h1 className="text-3xl font-extrabold">Money</h1><p role="alert" className="mt-4">Your role cannot view money pages.</p></main>;
  }
  if (!prisma) {
    return <main><h1 className="text-3xl font-extrabold">Money</h1><p role="status" className="mt-4">Database not configured yet.</p></main>;
  }
  const [payments, subs, expenses, refunds] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.subscription.groupBy({ by: ["status"], _count: true }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 100 }),
    prisma.payment.findMany({ where: { status: "refunded" }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]).catch(() => [[], [], [], []] as const);
  const sum = (list: readonly { amount: number; createdAt: Date }[], from?: Date) =>
    list.filter((p) => !from || p.createdAt >= from).reduce((a, p) => a + p.amount, 0);
  const revenueTotal = sum(payments);
  const revenue30 = sum(payments, startOf(29));
  const costs30 = expenses.filter((e) => e.date >= startOf(29)).reduce((a, e) => a + e.amount, 0);
  const costsTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const budget = parseInt(await getSetting("api_budget_usd"), 10) || 50;
  const budgetCents = budget * 100;
  const overBudget = costs30 > budgetCents;
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const canEdit = canEditMoney(admin.adminRole);

  return (
    <main>
      <h1 className="text-3xl font-extrabold">Money</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Amounts are in the payment currency&apos;s smallest unit (cents for USD) as reported by Paddle. Paddle does
        NOT refund its fee on refunds — see the Refund Policy. PDF tools have no AI cost, so costs below are hosting
        and other expenses only; no AI cost is invented here.
      </p>
      {overBudget && (
        <div role="alert" className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:bg-red-950">
          <p className="font-bold">Budget alert</p>
          <p>Trailing-30-day costs ({fmt(costs30)}) exceed the budget ({fmt(budgetCents)}). Review expenses below.</p>
        </div>
      )}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Revenue today", fmt(sum(payments, startOf(0)))],
          ["Revenue this week", fmt(sum(payments, startOf(6)))],
          ["Revenue this month", fmt(sum(payments, startOf(29)))],
          ["Revenue total", fmt(revenueTotal)],
          ["Net profit (30d)", fmt(revenue30 - costs30)],
          ["Net profit (total)", fmt(revenueTotal - costsTotal)],
          ["Costs (30d)", fmt(costs30)],
          ["MRR (active subs × $19 est.)", fmt(subs.filter((s) => s.status === "active").reduce((a, s) => a + s._count, 0) * 1900)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border-2 border-[#99f6e4] bg-white p-4 dark:border-teal-900 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </div>
      <section aria-label="Subscriptions by status" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Subscriptions by status</h2>
        {subs.length === 0 ? <p className="mt-2 text-slate-500">None yet.</p> : (
          <ul className="mt-2 space-y-1">{subs.map((s) => <li key={s.status}>{s.status} — {s._count}</li>)}</ul>
        )}
      </section>
      <section aria-label="Payments" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Per-client payment history (latest 100)</h2>
        {payments.length === 0 ? <p className="mt-2 text-slate-500">No payments yet.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr><th className="py-2 pr-3">User</th><th className="py-2 pr-3">Amount</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Transaction</th><th className="py-2">When</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 pr-3">{p.userId.slice(0, 8)}…</td>
                    <td className="py-2 pr-3">{fmt(p.amount)} {p.currency}</td>
                    <td className="py-2 pr-3">{p.status}</td>
                    <td className="py-2 pr-3">{p.transactionId.slice(0, 16)}…</td>
                    <td className="py-2">{p.createdAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-sm"><a href="/api/admin/money/export" className="underline">Download payments + expenses as CSV</a></p>
      </section>
      <section aria-label="Refunds" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Refunds</h2>
        {refunds.length === 0 ? <p className="mt-2 text-slate-500">No refunds recorded.</p> : (
          <ul className="mt-2 space-y-1 text-sm">{refunds.map((r) => <li key={r.id}>{fmt(r.amount)} {r.currency} — {r.transactionId} — {r.createdAt.toISOString().slice(0, 10)}</li>)}</ul>
        )}
      </section>
      <section aria-label="Expenses" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Expense tracker</h2>
        {expenses.length === 0 ? <p className="mt-2 text-slate-500">No expenses recorded.</p> : (
          <ul className="mt-2 space-y-2">
            {expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span>{e.date.toISOString().slice(0, 10)} — {e.category} — {e.vendor} — {fmt(e.amount)} {e.currency}{e.note ? ` — ${e.note}` : ""}</span>
                {canEdit && (
                  <form action={deleteExpense.bind(null, e.id)}><Button variant="outline" type="submit">Delete</Button></form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit ? (
          <form action={addExpense} className="mt-4 grid gap-2 sm:grid-cols-2">
            <div><label htmlFor="category" className="block font-bold">Category</label><input id="category" name="category" required placeholder="hosting, domain, ads, api" className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div><label htmlFor="vendor" className="block font-bold">Vendor</label><input id="vendor" name="vendor" required className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div><label htmlFor="amount" className="block font-bold">Amount (smallest unit, e.g. cents)</label><input id="amount" name="amount" type="number" min="0" required className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div><label htmlFor="currency" className="block font-bold">Currency</label><input id="currency" name="currency" defaultValue="USD" className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div><label htmlFor="date" className="block font-bold">Date</label><input id="date" name="date" type="date" required className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div><label htmlFor="note" className="block font-bold">Note</label><input id="note" name="note" className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" /></div>
            <div className="sm:col-span-2"><Button type="submit">Add expense</Button></div>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Your role is view-only for money: expense edits need SUPER.</p>
        )}
      </section>
      <section aria-label="Printable report" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Printable report</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Use your browser&apos;s Print → Save as PDF on this page for a money report, or download the CSV above.
        </p>
      </section>
    </main>
  );
}
