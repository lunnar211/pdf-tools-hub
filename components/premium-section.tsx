import { Check } from "lucide-react";
import Link from "next/link";
export function PremiumSection() {
  return (
    <section aria-label="Premium plan" className="mx-auto max-w-6xl px-4 py-12">
      <div className="rounded-2xl border-2 border-[#0d9488] bg-white p-6 dark:border-teal-700 dark:bg-slate-900">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Premium, when you need more</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">The free tier covers everyday use: 20 conversions a day. Premium raises the limits and removes ads.</p>
        <ul className="mt-4 space-y-2">
          {["1,000 conversions a day on Premium (vs 20 guest / 100 signed-in free)", "No ads anywhere on the site", "All 12 tools included", "Price shown at the secure Paddle checkout"].map((f) => (
            <li key={f} className="flex items-start gap-2 text-slate-700 dark:text-slate-200"><Check className="mt-1 shrink-0 text-[#0d9488]" size={18} aria-hidden="true" />{f}</li>
          ))}
        </ul>
        <div className="mt-5">
          <Link href="/pricing" className="inline-flex min-h-[44px] items-center rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]">See Premium pricing</Link>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Premium checkout runs through Paddle&apos;s secure hosted checkout (sign-in + age 18+ required). No payment details are collected on this site.</p>
        </div>
      </div>
    </section>
  );
}
