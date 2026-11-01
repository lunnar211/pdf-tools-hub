import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin | PDF Tools Hub",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/usage", label: "Usage & abuse" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/support", label: "Support inbox" },
  { href: "/admin/logs", label: "Logs" },
];

// Server-side gate: signed-in + ADMIN role required even to see the nav.
// Individual pages additionally require a fresh TOTP verification
// (getAdminSession + totpFresh); this layout intentionally does NOT grant
// page access by itself.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { supabaseUser, dbUser } = await getCurrentUser();
  if (!supabaseUser) redirect("/signin");
  if (!dbUser || dbUser.role !== "ADMIN" || !dbUser.adminRole) redirect("/");
  const role = dbUser.adminRole;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Admin panel — signed in as {dbUser.email} (role: {role})
      </p>
      <nav aria-label="Admin navigation" className="mt-3 flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] dark:border-teal-900 dark:bg-slate-900 dark:text-slate-200"
          >
            {item.label}
          </Link>
        ))}
        <Link href="/admin/setup-2fa" className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] dark:border-teal-900 dark:bg-slate-900 dark:text-slate-200">
          2FA setup
        </Link>
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
