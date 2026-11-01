import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Guides | PDF Tools Hub",
  description:
    "Short, practical guides for everyday PDF jobs: phone photos to PDF, splitting by pages, shrinking for email, and how OCR works.",
  openGraph: {
    title: "Guides | PDF Tools Hub",
    description: "Short, practical guides for everyday PDF jobs.",
    type: "website",
    images: [{ url: "/og/guides.jpg", width: 1200, height: 630 }],
  },
};

export default function Page() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">Guides</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
        Short, practical guides for everyday PDF jobs — written for this site, with a link to the
        tool each guide describes.
      </p>
      <ul className="mt-8 space-y-4">
        {GUIDES.map((g) => (
          <li
            key={g.slug}
            className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900"
          >
            <h2 className="text-xl font-bold">
              <Link href={`/guides/${g.slug}`} className="text-[#0f766e] hover:underline dark:text-[#5eead4]">
                {g.title}
              </Link>
            </h2>
            <p className="mt-1 text-slate-600 dark:text-slate-300">{g.meta}</p>
            <Link
              href={`/guides/${g.slug}`}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] px-4 py-2 font-semibold text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950"
            >
              Read the guide
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
