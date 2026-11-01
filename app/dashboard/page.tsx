import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getQuota } from "@/lib/settings";
import { countJobsToday } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "Dashboard | PDF Tools Hub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Dashboard: the signed-in overview, mirroring LeadsForceGen's /dashboard.
// Every number below comes from the shared database (the owner's existing
// Supabase "LeadForge" project) via the Prisma User/Job rows keyed to the
// Supabase Auth identity — no demo, hardcoded, or placeholder stats. When
// the database is not configured (owner step), the page says so honestly
// instead of showing numbers.
const QUICK_TOOLS = [
  { href: "/image-to-pdf", label: "Image to PDF" },
  { href: "/merge-pdf", label: "Merge PDF" },
  { href: "/split-pdf", label: "Split PDF" },
  { href: "/compress-pdf", label: "Compress PDF" },
  { href: "/ocr-pdf", label: "OCR PDF" },
  { href: "/rotate-pdf", label: "Rotate PDF" },
];

export default async function Page() {
  const { supabaseUser, dbUser } = await getCurrentUser();
  if (!supabaseUser) redirect("/signin");
  const email = supabaseUser.email ?? "";
  const name = dbUser?.name ?? (supabaseUser.user_metadata?.full_name as string | undefined) ?? email;
  const plan = dbUser?.plan ?? "FREE";
  const jobs = dbUser
    ? await prisma!.job.findMany({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, take: 10 }).catch(() => [])
    : [];
  const today = dbUser ? await countJobsToday(dbUser.id) : null;
  const quota = dbUser ? await getQuota(plan === "PREMIUM" ? "PREMIUM" : "FREE") : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Dashboard</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Signed in as {email}. Your usage and history below come from your account on the shared database.
      </p>
      {!prisma && (
        <div role="status" className="mt-4 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-4 dark:bg-orange-950">
          <p className="font-bold">Account database not configured yet</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Your sign-in works, but usage and job history need the shared database (owner step). The PDF tools
            still work.
          </p>
        </div>
      )}
      {prisma && !dbUser && (
        <div role="status" className="mt-4 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-4 dark:bg-orange-950">
          <p className="font-bold">Account data unavailable right now</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
            Your sign-in works, but your account data could not be loaded. Please try again later.
          </p>
        </div>
      )}
      <section aria-label="Overview" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div><dt className="font-semibold">Name</dt><dd>{name}</dd></div>
          <div><dt className="font-semibold">Plan</dt><dd>{plan}</dd></div>
          {today !== null && quota !== null && (
            <div><dt className="font-semibold">Used today</dt><dd>{today} / {quota} conversions</dd></div>
          )}
          <div><dt className="font-semibold">Recent jobs shown</dt><dd>{jobs.length}</dd></div>
        </dl>
        <div className="mt-4">
          <Link href="/account" className="font-semibold text-[#0f766e] underline dark:text-[#5eead4]">
            Manage your account, export, or delete your data
          </Link>
        </div>
      </section>

      <section aria-label="Recent conversions" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Recent conversions</h2>
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

      <section aria-label="Quick tools" className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <h2 className="text-xl font-bold">Quick tools</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {QUICK_TOOLS.map((t) => (
            <li key={t.href}>
              <Link href={t.href} className="inline-block min-h-[44px] rounded-lg bg-[#f0fdfa] px-3 py-2.5 font-semibold text-[#0f766e] dark:bg-teal-950 dark:text-[#5eead4]">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
