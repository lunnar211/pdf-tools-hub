import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./form";

export const metadata: Metadata = {
  title: "Finish setting up your account | PDF Tools Hub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const email = String(session.user.email ?? "");
  const dbUser = prisma ? await prisma.user.findUnique({ where: { email } }).catch(() => null) : null;
  if (dbUser?.ageConfirmed) redirect("/account");
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">One more step</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Tell us your date of birth so we can apply the right account rules. This takes less than a minute.
      </p>
      {dbUser?.status === "SUSPENDED" ? (
        <div role="status" className="mt-6 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-5 dark:bg-orange-950">
          <p className="font-bold">This account cannot be activated yet</p>
          <p className="mt-1 text-slate-700 dark:text-slate-200">
            Accounts can only be activated from age 16. You can still use the PDF tools without signing in.
          </p>
        </div>
      ) : !prisma ? (
        <div role="status" className="mt-6 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-5 dark:bg-orange-950">
          <p className="font-bold">Account database not configured yet</p>
          <p className="mt-1 text-slate-700 dark:text-slate-200">Onboarding needs the shared database (owner step).</p>
        </div>
      ) : (
        <div className="mt-6"><OnboardingForm /></div>
      )}
    </main>
  );
}
