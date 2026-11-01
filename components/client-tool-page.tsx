// Page shell for BROWSER-side tools: same hero + JSON-LD + how-to + FAQ
// pattern as ToolPage, but the tool UI is a client component passed as
// children (no server endpoint). Keeps SEO structure identical across
// server and browser tools.
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdSlot } from "./ad-slot";
import type { ToolContent } from "@/lib/tool-content";

export function clientToolMetadata(c: ToolContent): Metadata {
  return {
    title: `${c.title} — Free Online | PDF Tools Hub`,
    description: c.meta,
    openGraph: { title: `${c.title} | PDF Tools Hub`, description: c.meta, type: "website", images: [{ url: `/og/${c.slug}.jpg`, width: 1200, height: 630 }] },
  };
}

export function ClientToolPage({ c, children }: { c: ToolContent; children: ReactNode }) {
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const appJson = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `PDF Tools Hub — ${c.title}`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJson) }} />
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">{c.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">{c.description}</p>
      <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{c.limits}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-6 rounded-xl border-2 border-[#ea580c] bg-orange-50 p-4 text-slate-700 dark:border-orange-800 dark:bg-orange-950 dark:text-slate-200">
        <p className="font-bold">Please note</p>
        <p className="mt-1">{c.note}</p>
      </div>
      <AdSlot />
      <section className="mt-10" aria-label="How to use this tool">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How it works</h2>
        <ol className="mt-4 space-y-3">
          {c.howTo.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d9488] font-bold text-white"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="pt-1 text-slate-700 dark:text-slate-200">{s}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="mt-10" aria-label="Good uses for this tool">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Good uses</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-700 dark:text-slate-200">
          {c.useCases.map((u) => (
            <li key={u}>{u}</li>
          ))}
        </ul>
      </section>
      <section className="mt-10" aria-label="Frequently asked questions">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
        <div className="mt-4 space-y-4">
          {c.faqs.map((f) => (
            <div
              key={f.q}
              className="rounded-xl border border-[#99f6e4] bg-white p-4 dark:border-teal-900 dark:bg-slate-900"
            >
              <h3 className="font-bold text-slate-900 dark:text-white">{f.q}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{f.a}</p>
            </div>
          ))}
        </div>
      </section>
      <p className="mt-10 rounded-xl bg-[#f0fdfa] p-4 text-sm text-slate-600 dark:bg-teal-950 dark:text-slate-300">
        This tool converts files in your browser — your files never leave your device and are never
        uploaded, listed or shared.
      </p>
    </main>
  );
}
