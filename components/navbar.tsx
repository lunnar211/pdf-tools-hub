"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown, FileText, ExternalLink } from "lucide-react";
import { TOOLS, SISTER_SITE_URL, LEADSFORCEGEN_URL } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user as unknown as Record<string, unknown> | undefined;
  const isAdmin = user?.role === "ADMIN";
  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#99f6e4] bg-white dark:border-teal-900 dark:bg-slate-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3" aria-label="Main navigation">
        <Link href="/" className="flex min-h-[44px] items-center gap-2 text-xl font-extrabold text-[#0f766e] dark:text-[#5eead4]">
          <FileText size={26} aria-hidden="true" />
          <span>PDF Tools Hub</span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}
              className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] dark:text-slate-200 dark:hover:bg-teal-950">
              More tools <ChevronDown size={18} aria-hidden="true" />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border-2 border-[#99f6e4] bg-white p-2 shadow-none dark:border-teal-900 dark:bg-slate-900" role="menu">
                {TOOLS.map((t) => (
                  <Link key={t.slug} href={`/${t.slug}`} role="menuitem" onClick={() => setOpen(false)}
                    className="block min-h-[44px] rounded-lg px-3 py-2.5 font-medium text-slate-700 hover:bg-[#f0fdfa] dark:text-slate-200 dark:hover:bg-teal-950">
                    {t.title}
                  </Link>
                ))}
                <hr className="my-2 border-[#99f6e4] dark:border-teal-900" />
                <a href={SISTER_SITE_URL} target="_blank" rel="noopener noreferrer" role="menuitem" className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2.5 font-medium text-slate-700 hover:bg-[#f0fdfa] dark:text-slate-200 dark:hover:bg-teal-950">
                  AI Studio <ExternalLink size={16} aria-hidden="true" />
                </a>
                <a href={LEADSFORCEGEN_URL} target="_blank" rel="noopener noreferrer" role="menuitem" className="flex min-h-[44px] items-center gap-1 rounded-lg px-3 py-2.5 font-medium text-slate-700 hover:bg-[#f0fdfa] dark:text-slate-200 dark:hover:bg-teal-950">
                  LeadsForceGen <ExternalLink size={16} aria-hidden="true" />
                </a>
              </div>
            )}
          </div>
          <Link href="/about" className="hidden min-h-[44px] items-center rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:flex dark:text-slate-200 dark:hover:bg-teal-950">About</Link>
          {session ? (
            <>
              <Link href="/account" className="flex min-h-[44px] items-center rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] dark:text-slate-200 dark:hover:bg-teal-950">Account</Link>
              {isAdmin && (
                <Link href="/admin" className="hidden min-h-[44px] items-center rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:flex dark:text-slate-200 dark:hover:bg-teal-950">Admin</Link>
              )}
            </>
          ) : (
            <Link href="/signin" className="flex min-h-[44px] items-center rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] dark:text-slate-200 dark:hover:bg-teal-950">Sign in</Link>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
