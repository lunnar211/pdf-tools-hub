"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, FileText, ExternalLink } from "lucide-react";
import { TOOLS, SISTER_SITE_URL, LEADSFORCEGEN_URL } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  // Supabase session state (browser client) + a server-resolved admin flag
  // from /api/account/me. The Admin link is display-only: every admin page
  // and API route re-checks role + TOTP server-side regardless.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(Boolean(data.session));
      if (data.session) {
        const me = await fetch("/api/account/me").then((r) => r.json()).catch(() => null);
        setIsAdmin(Boolean(me?.isAdmin));
      } else {
        setIsAdmin(false);
      }
    };
    void refresh();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => listener.subscription.unsubscribe();
  }, []);
  return (
    <header className="sticky top-0 z-40 border-b-2 border-[#99f6e4] bg-white dark:border-teal-900 dark:bg-slate-950">
      <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-1 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3" aria-label="Main navigation">
        <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap text-base font-extrabold text-[#0f766e] sm:gap-2 sm:text-xl dark:text-[#5eead4]">
          <FileText size={22} aria-hidden="true" />
          <span>PDF Tools Hub</span>
        </Link>
        <div className="flex items-center gap-1">
          <div className="sm:relative">
            <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}
              className="flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:px-3 dark:text-slate-200 dark:hover:bg-teal-950">
              <span className="sm:hidden">Tools</span><span className="hidden sm:inline">More tools</span> <ChevronDown size={18} aria-hidden="true" className="hidden sm:block" />
            </button>
            {open && (
              <div className="absolute left-3 right-3 top-full mt-1 rounded-xl border-2 border-[#99f6e4] bg-white p-2 shadow-none sm:left-auto sm:right-0 sm:w-72 dark:border-teal-900 dark:bg-slate-900" role="menu">
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
          {signedIn ? (
            <>
              <Link href="/dashboard" className="flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-2 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:px-3 dark:text-slate-200 dark:hover:bg-teal-950">Dashboard</Link>
              <Link href="/account" className="flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-2 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:px-3 dark:text-slate-200 dark:hover:bg-teal-950">Account</Link>
              {isAdmin && (
                <Link href="/admin" className="hidden min-h-[44px] items-center rounded-lg px-3 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:flex dark:text-slate-200 dark:hover:bg-teal-950">Admin</Link>
              )}
            </>
          ) : (
            <Link href="/signin" className="flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-2 py-2 font-semibold text-slate-700 hover:bg-[#f0fdfa] sm:px-3 dark:text-slate-200 dark:hover:bg-teal-950">Sign in</Link>
          )}
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
