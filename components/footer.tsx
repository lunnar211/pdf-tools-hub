"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SISTER_SITE_URL, LEADSFORCEGEN_URL, TOOLS } from "@/lib/site";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
export function Footer() {
  // The Admin link is hidden from visitors with no signed-in session
  // (same pattern as the navbar, which additionally requires the admin
  // flag). It starts hidden and only appears after the browser session
  // check confirms a session — so a logged-out visitor never sees it.
  // Clicking it still proves nothing: every admin page and API route
  // re-checks role + TOTP server-side, and signed-in non-admins are
  // redirected to / by the admin layout, never shown the console.
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(Boolean(data.session));
    };
    void refresh();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void refresh());
    return () => listener.subscription.unsubscribe();
  }, []);
  return (
    <footer className="border-t-2 border-[#99f6e4] bg-[#f0fdfa] dark:border-teal-900 dark:bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-[#0f766e] dark:text-[#5eead4]">PDF Tools Hub</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Free, everyday PDF tools. No account needed for the free tier. Files are processed in your browser or in memory on our server — never stored, never listed or shared.</p>
        </div>
        <nav aria-label="PDF tools">
          <p className="font-bold text-slate-800 dark:text-slate-100">Tools</p>
          <ul className="mt-2 space-y-1">
            {TOOLS.map((t) => (
              <li key={t.slug}><Link href={`/${t.slug}`} className="inline-flex min-h-[44px] items-center text-[#0f766e] underline-offset-2 hover:underline dark:text-[#5eead4]">{t.title}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Site pages">
          <p className="font-bold text-slate-800 dark:text-slate-100">More</p>
          <ul className="mt-2 space-y-1">
            <li><Link href="/about" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">About</Link></li>
            <li><Link href="/contact" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Contact</Link></li>
            <li><Link href="/privacy" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Privacy</Link></li>
            <li><Link href="/terms" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Terms</Link></li>
            <li><Link href="/cookies" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Cookie Policy</Link></li>
            <li><Link href="/refund-policy" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Refund Policy</Link></li>
            <li><Link href="/acceptable-use" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Acceptable Use</Link></li>
            <li><Link href="/dmca" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">DMCA</Link></li>
            <li><Link href="/disclaimer" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Disclaimer</Link></li>
            {signedIn && (
              <li><Link href="/admin" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Admin</Link></li>
            )}
            <li><a href={SISTER_SITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">AI Studio (our other project)</a></li>
            <li><a href={LEADSFORCEGEN_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">LeadsForceGen (our other project)</a></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-[#99f6e4] py-4 text-center text-sm text-slate-600 dark:border-teal-900 dark:text-slate-400">PDF Tools Hub. Free for guests: around 20 conversions a day as a fair-use guideline — sign in (free) for a tracked 100 a day.</p>
    </footer>
  );
}
