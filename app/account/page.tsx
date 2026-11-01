import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getQuota } from "@/lib/settings";
import { countJobsToday } from "@/lib/jobs";
import { canBuyPaid } from "@/lib/age";
import { ExportButton, DeleteButton, CheckoutButton, SignOutButton } from "./account-actions";

export const metadata: Metadata = {
  title: "My account | PDF Tools Hub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const { supabaseUser, dbUser } = await getCurrentUser();
  if (!supabaseUser) redirect("/signin");
  const email = supabaseUser.email ?? "";
  const plan = dbUser?.plan ?? "FREE";
  const user = {
    email,
    name: dbUser?.name ?? (supabaseUser.user_metadata?.full_name as string | undefined) ?? email,
    image: dbUser?.image ?? (supabaseUser.user_metadata?.avatar_url as string | undefined) ?? null,
  };
  const jobs = dbUser
    ? await prisma!.job.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => [])
    : [];
  const today = dbUser ? await countJobsToday(dbUser.id) : 0;
  const quota = await getQuota(plan === "PREMIUM" ? "PREMIUM" : "FREE");
  const canBuy = dbUser ? canBuyPaid(dbUser.dateOfBirth) : false;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">My account</h1>
      {!prisma && (
        <div role="status" className="mt-4 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-4 dark:bg-orange-950">
          <p className="font-bold">Account database not configured yet</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Your sign-in works, but job history, export, and delete need the shared database (owner step). The PDF
            tools still work.
          </p>
        </div>
      )}
      <section aria-label="Profile" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          {typeof user.image === "string" && user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" width={56} height={56} className="rounded-full" referrerPolicy="no-referrer" />
          ) : null}
          <div>
            <p className="text-xl font-bold">{user.name}</p>
            <p className="text-slate-600 dark:text-slate-300">{email}</p>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          <div><dt className="font-semibold">Plan</dt><dd>{plan}</dd></div>
          <div><dt className="font-semibold">Country</dt><dd>{dbUser?.country ?? "Not set"}</dd></div>
          <div><dt className="font-semibold">Used today</dt><dd>{today} / {quota} conversions</dd></div>
          <div><dt className="font-semibold">Job history</dt><dd>{jobs.length} recent jobs shown</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <SignOutButton />
        </div>
      </section>

      <section aria-label="Premium" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Premium</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">
          Premium raises your daily limit to {await getQuota("PREMIUM")} conversions and removes ads. Payments are
          handled by Paddle (merchant of record); this site never sees or stores card details.
        </p>
        <div className="mt-4">
          <CheckoutButton alreadyPremium={plan === "PREMIUM"} canBuy={canBuy} />
        </div>
      </section>

      <section aria-label="Job history" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Job history</h2>
        {jobs.length === 0 ? (
          <p className="mt-2 text-slate-600 dark:text-slate-300">No jobs recorded yet. Conversions you run while signed in appear here.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr><th className="py-2 pr-3">Tool</th><th className="py-2 pr-3">Status</th><th className="py-2">When</th></tr></thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2 pr-3">{j.tool}</td>
                    <td className="py-2 pr-3">{j.status}</td>
                    <td className="py-2">{j.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Your data" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Your data</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Export downloads your profile, jobs, subscriptions, and payments as JSON. Delete removes them permanently
          from this site&apos;s database. Note: delete removes your site profile, but your Google sign-in identity
          itself lives in Supabase Auth and can only be removed by the site owner from the Supabase dashboard (the
          browser key cannot delete Auth users) — after deleting here, sign out and contact support if you also want
          the sign-in identity removed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <ExportButton />
          <DeleteButton />
        </div>
      </section>
    </main>
  );
}
