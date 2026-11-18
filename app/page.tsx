import dynamic from "next/dynamic";
import Link from "next/link";
import { ShieldCheck, Zap, Trash2, Sparkles, Users } from "lucide-react";
import { SISTER_SITE_URL, LEADSFORCEGEN_URL } from "@/lib/site";

// Heavy client pieces are code-split off the first paint: the homepage
// ships no PDF/OCR machinery and no motion library above the fold.
const ToolGrid = dynamic(() => import("@/components/tool-grid").then((m) => m.ToolGrid));
const HeroDemo = dynamic(() => import("@/components/hero-demo").then((m) => m.HeroDemo));
const PremiumSection = dynamic(() => import("@/components/premium-section").then((m) => m.PremiumSection));
const AdSlot = dynamic(() => import("@/components/ad-slot").then((m) => m.AdSlot));

export default function Home() {
  return (
    <main>
      {/* Hero: the desk. Headline on the left, a real working tray on the right — visible on phones too. */}
      <section className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-12 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            The paper desk for PDF work
          </p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl dark:text-white">
            PDF work, done in a minute, without installing anything
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Convert, merge, split and shrink PDFs right in your browser. Free for everyday use, no account needed, and your files are never stored — browser tools never upload them, and server tools process them in memory only.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pdf-to-word" className="inline-flex min-h-[44px] items-center rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]">Start converting</Link>
            <Link href="/merge-pdf" className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#0d9488] px-5 py-2.5 font-semibold text-[#0f766e] hover:bg-white dark:text-[#5eead4]">Merge PDFs</Link>
          </div>
          <p className="mt-4 font-mono text-sm text-slate-600 dark:text-slate-300">report.pdf · 3 pages · 2.1 MB — that is all a file is here: pages, not data.</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Free for guests: around 20 conversions a day (fair-use guideline). PDFs up to 25 MB. Sign in free for a tracked 100 a day.</p>
          <ul className="mt-4 flex flex-wrap gap-3" aria-label="Trust stamps">
            <li><span className="stamp">No watermark</span></li>
            <li><span className="stamp">Browser tools never upload</span></li>
            <li><span className="stamp stamp-orange">Server files never stored</span></li>
          </ul>
        </div>
        <HeroDemo />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-label="All tools">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Every tool on the desk</h2>
        <ToolGrid />
        <p className="mt-6 flex flex-wrap gap-2 text-sm font-semibold">
          <Link href="/jpg-to-pdf" className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] px-4 py-2 text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950">JPG to PDF</Link>
          <Link href="/photos-to-pdf-on-phone" className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] px-4 py-2 text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950">Photos to PDF on your phone</Link>
          <Link href="/scan-to-pdf-free" className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] px-4 py-2 text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950">Scan to PDF free</Link>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-label="How it works">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">How it works</h2>
        <ol className="mt-6 space-y-4">
          {[
            { t: "Upload your file", d: "Drag it onto the tool page or pick it from your device. Nothing is installed." },
            { t: "Convert in your browser or on our server", d: "Browser tools never upload your file at all. Server tools process it in memory and never store it." },
            { t: "Download the result", d: "Save the converted file. Browser results are also kept on your device for 1-hour re-download; server files are gone when the response ends." },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-3 border-b border-dashed border-[#99f6e4] pb-4 dark:border-teal-800">
              <span className="shrink-0 font-mono text-lg font-bold text-[#c2410c] dark:text-[#fb923c]" aria-hidden="true">{String(i + 1).padStart(2, "0")}.</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{s.t}</h3>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-label="Why you can trust this site">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <ShieldCheck size={26} aria-hidden="true" />, t: "Files stay private", d: "Browser tools never upload your files. Server tools process them in memory only — nothing is ever written to disk. Never listed, never shared." },
            { icon: <Zap size={26} aria-hidden="true" />, t: "No account for free use", d: "The free tier needs no sign-up. Just open a tool and convert." },
            { icon: <Trash2 size={26} aria-hidden="true" />, t: "Nothing kept behind your back", d: "No public file listings, no file gallery, no reuse of your documents." },
          ].map((s, i) => (
            <div key={s.t} className="h-full">
            <div className="dog-ear h-full rounded-lg bg-white p-5 dark:bg-slate-900">
              <span className="text-[#0d9488] dark:text-[#5eead4]">{s.icon}</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{s.t}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{s.d}</p>
            </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-label="Frequently asked questions">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Questions people ask</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { q: "Is PDF Tools Hub really free?", a: "Yes, for everyday use: around 20 conversions a day for guests as a fair-use guideline, no account needed. Signing in (free) gives a tracked 100 a day. Premium raises the limit to 1,000 a day and removes ads — see Pricing. Payments go through Paddle's secure checkout; nothing on this site collects payment details." },
            { q: "Do you keep my files?", a: "No. Browser tools never upload your files at all. Server tools process them in memory only — nothing is written to disk — and they are gone when the response ends. They are never listed publicly or shared." },
            { q: "What size files can I convert?", a: "PDFs up to 25 MB, and images up to 10 MB each (max 20 per request)." },
            { q: "Will a PDF to Word conversion look identical?", a: "No — text is preserved and larger text becomes headings, but layout, images and tables are approximated. Each tool page states its fidelity limit plainly." },
            { q: "Can I password-protect or unlock a PDF here?", a: "No, and that is deliberate. Real PDF encryption is not supported by the libraries this site uses (pdf-lib cannot encrypt or open encrypted PDFs), so a password field here would be fake security. No fake lock is offered." },
          ].map((f, i) => (
            <div key={f.q} className="h-full">
            <div className="h-full rounded-xl border border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white">{f.q}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{f.a}</p>
            </div>
            </div>
          ))}
        </div>
      </section>

      <AdSlot />
      <PremiumSection />

      <section className="mx-auto max-w-6xl px-4 pb-16" aria-label="Our other projects">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Our other projects</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="h-full">
          <a href={SISTER_SITE_URL} target="_blank" rel="noopener noreferrer" className="block h-full rounded-lg border-2 border-[#99f6e4] bg-white p-6 hover:border-[#0d9488] dark:border-teal-900 dark:bg-slate-900">
            <Sparkles className="text-[#ea580c]" size={28} aria-hidden="true" />
            <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">AI Studio</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">AI logo generation and AI photo enhancement, from the same team.</p>
          </a>
          </div>
          <div className="h-full">
          <a href={LEADSFORCEGEN_URL} target="_blank" rel="noopener noreferrer" className="block h-full rounded-lg border-2 border-[#99f6e4] bg-white p-6 hover:border-[#0d9488] dark:border-teal-900 dark:bg-slate-900">
            <Users className="text-[#ea580c]" size={28} aria-hidden="true" />
            <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">LeadsForceGen</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">Find business leads for outreach, with a free daily tier.</p>
          </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16" aria-label="Android app">
        <div>
        <div className="rounded-lg border-2 border-[#99f6e4] bg-white p-6 dark:border-teal-900 dark:bg-slate-900">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">PDF Tools Hub on Android</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            The Android app is this website in an app: the same PDF tools, the same login, the same data. Download the APK, allow install from unknown sources once on your phone, then sign in with your usual account.
          </p>
          <a href="https://github.com/lunnar211/android-apps/releases/latest/download/pdf-tools-hub-debug.apk" className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#0d9488] px-5 font-bold text-white">
            Download for Android (.apk)
          </a>
          <p className="mt-3 text-sm">
            <a href="https://github.com/lunnar211/android-apps/releases" target="_blank" rel="noopener noreferrer" className="underline">All Android apps on GitHub</a>
          </p>
        </div>
        </div>
      </section>
    </main>
  );
}
