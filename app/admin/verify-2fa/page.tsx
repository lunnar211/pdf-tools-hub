import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import { VerifyForm } from "./form";

export const metadata: Metadata = {
  title: "Verify two-factor authentication | PDF Tools Hub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Two-factor check</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Enter the current code from your authenticator app to open the admin panel.</p>
      <div className="mt-6 max-w-md rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <VerifyForm />
      </div>
    </main>
  );
}
