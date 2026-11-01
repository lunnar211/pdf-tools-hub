import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES } from "@/lib/guides";

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  return { title: `${guide.title} | PDF Tools Hub`, description: guide.meta, openGraph: { title: `${guide.title} | PDF Tools Hub`, description: guide.meta, type: "article", images: [{ url: "/og/guides.jpg", width: 1200, height: 630 }] } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();
  const articleJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.meta,
  };
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJson) }} />
      <p className="text-sm font-semibold text-[#0f766e] dark:text-[#5eead4]">
        <Link href="/guides" className="hover:underline">← All guides</Link>
      </p>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">{guide.title}</h1>
      <p className="mt-3 text-lg text-slate-600 dark:text-slate-300">{guide.intro}</p>
      {guide.sections.map((s) => (
        <section key={s.heading} className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{s.heading}</h2>
          <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-200">{s.body}</p>
        </section>
      ))}
      <div className="mt-10">
        <Link
          href={`/${guide.toolSlug}`}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]"
        >
          {guide.toolLabel} →
        </Link>
      </div>
    </main>
  );
}
