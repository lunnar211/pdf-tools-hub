import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";
import { SetupForm } from "./form";

export const metadata: Metadata = {
  title: "Set up two-factor authentication | PDF Tools Hub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getAdminSession();
  if (!admin) redirect("/signin");
  const user = prisma ? await prisma.user.findUnique({ where: { id: admin.userId } }).catch(() => null) : null;
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Set up two-factor authentication</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Admin access needs a second step: a time-based code from an authenticator app (Google Authenticator, Authy,
        or similar). Your secret is encrypted with AES-256-GCM before it is stored, and 2FA only turns on after you
        prove a correct code.
      </p>
      {user?.totpEnabled ? (
        <p role="status" className="mt-4 font-semibold text-teal-700 dark:text-teal-300">
          Two-factor authentication is already enabled for your account. Generating a new QR code replaces the old one.
        </p>
      ) : null}
      <div className="mt-6 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <SetupForm />
      </div>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        There is no password login and no fallback credential for admins: sign-in is Google-only, restricted to the
        ADMIN_EMAILS allowlist, plus this TOTP step. That is deliberate — a leaked password alone can never open the
        admin panel.
      </p>
    </main>
  );
}
