import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

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

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const role = (session.user as unknown as Record<string, unknown>).adminRole as string | null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
        Admin panel — signed in as {String(session.user.email ?? "")} (role: {role ?? "none"})
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
