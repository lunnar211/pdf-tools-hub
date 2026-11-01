import Link from "next/link";
import { SISTER_SITE_URL, LEADSFORCEGEN_URL, TOOLS } from "@/lib/site";
export function Footer() {
  return (
    <footer className="border-t-2 border-[#99f6e4] bg-[#f0fdfa] dark:border-teal-900 dark:bg-slate-950">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold text-[#0f766e] dark:text-[#5eead4]">PDF Tools Hub</p>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Free, everyday PDF tools. No account needed for the free tier. Files are processed on our server and deleted immediately after processing (max 60 minutes in any case); we never list or share them.</p>
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
            <li><Link href="/admin" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">Admin</Link></li>
            <li><a href={SISTER_SITE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">AI Studio (our other project)</a></li>
            <li><a href={LEADSFORCEGEN_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-[#0f766e] hover:underline dark:text-[#5eead4]">LeadsForceGen (our other project)</a></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-[#99f6e4] py-4 text-center text-sm text-slate-600 dark:border-teal-900 dark:text-slate-400">PDF Tools Hub. Free tier: 20 conversions per day per visitor.</p>
    </footer>
  );
}
