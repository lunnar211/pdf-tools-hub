import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LANDINGS } from "@/lib/landings";
import { TOOLS } from "@/lib/site";
import { ToolMasthead } from "./tool-masthead";

export function landingMetadata(slug: string): Metadata {
  const l = LANDINGS.find((x) => x.slug === slug);
  if (!l) return {};
  // All four landings are the same Image to PDF tool — canonicalise to
  // the real tool page so the landings don't compete with each other.
  return {
    title: `${l.title} | PDF Tools Hub`,
    description: l.meta,
    alternates: { canonical: `/${l.toolSlug}` },
    openGraph: { title: `${l.title} | PDF Tools Hub`, description: l.meta, type: "website", url: `/${l.toolSlug}`, images: [{ url: `/og/${slug}.jpg`, width: 1200, height: 630 }] },
  };
}

export function LandingPage({ slug }: { slug: string }) {
  const l = LANDINGS.find((x) => x.slug === slug);
  if (!l) notFound();
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: l.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const tool = TOOLS.find((t) => t.slug === l.toolSlug);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <ToolMasthead family="image" title={l.hero} description={l.intro} limits="Images up to 10 MB each, max 20 per conversion. Free tier: around 20 conversions a day for guests (fair-use guideline)." receipt={`${l.slug} · same tool as image-to-pdf · canonical: /image-to-pdf`} />
      <div className="mt-6">
        <Link
          href={`/${l.toolSlug}`}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-[#ea580c] px-6 py-3 font-semibold text-white hover:bg-[#c2410c]"
        >
          {l.toolLabel} →
        </Link>
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {l.points.map((p) => (
          <li
            key={p}
            className="rounded-xl border-2 border-[#99f6e4] bg-white p-4 font-medium text-slate-700 dark:border-teal-900 dark:bg-slate-900 dark:text-slate-200"
          >
            ✓ {p}
          </li>
        ))}
      </ul>
      <section className="mt-10" aria-label="Frequently asked questions">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
        <div className="mt-4 space-y-4">
          {l.faqs.map((f) => (
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
      <section className="mt-10" aria-label="More tools">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">More tools you may need</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TOOLS.filter((t) => t.slug !== l.toolSlug)
            .slice(0, 6)
            .map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/${t.slug}`}
                  className="inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] px-4 py-2 font-semibold text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950"
                >
                  {t.title}
                </Link>
              </li>
            ))}
        </ul>
      </section>
      {tool && (
        <p className="mt-8 text-sm text-slate-500">
          {tool.title}: {tool.short}
        </p>
      )}
    </main>
  );
}
