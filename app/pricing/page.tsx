import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { getQuota } from "@/lib/settings";
import { paddleConfigured } from "@/lib/paddle";
import { canBuyPaid } from "@/lib/age";
import { CheckoutButton } from "@/app/account/account-actions";
import { TOOLS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pricing — Free vs Premium | PDF Tools Hub",
  description:
    "PDF Tools Hub is free for everyday use. Premium raises your daily limit and removes ads. The exact price is shown at the secure Paddle checkout.",
  openGraph: {
    title: "Pricing — Free vs Premium | PDF Tools Hub",
    description: "Free for everyday use. Premium raises your daily limit and removes ads.",
    type: "website",
    images: [{ url: "/og/pricing.jpg", width: 1200, height: 630 }],
  },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const guestQuota = await getQuota("GUEST");
  const freeQuota = await getQuota("FREE");
  const premiumQuota = await getQuota("PREMIUM");
  const configured = paddleConfigured();
  const { supabaseUser, dbUser } = await getCurrentUser();
  const plan = dbUser?.plan ?? "FREE";
  const canBuy = dbUser ? canBuyPaid(dbUser.dateOfBirth) : false;

  const freeFeatures = [
    `${guestQuota} conversions a day without signing in (fair-use guideline)`,
    `${freeQuota} conversions per day when signed in (tracked)`,
    "All 12 tools, including browser conversion",
    "No watermark on your files",
    "Files processed in memory or in your browser — never stored",
  ];
  const premiumFeatures = [
    `${premiumQuota} conversions per day`,
    "No ads anywhere on the site",
    "Everything in Free",
    "Payments handled by Paddle (merchant of record) — this site never sees card details",
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
        Simple pricing: free, or Premium for heavy use
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
        Every tool is free to try. Premium exists for people who convert a lot: a higher daily limit
        and no ads. The price is shown at the secure Paddle checkout — this page never invents a
        number.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border-2 border-[#99f6e4] bg-white p-6 dark:border-teal-900 dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Free</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">For everyday use. No card needed.</p>
          <ul className="mt-4 space-y-2 text-slate-700 dark:text-slate-200">
            {freeFeatures.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-lg border-2 border-[#99f6e4] px-5 py-2.5 font-semibold text-[#0f766e] hover:bg-[#f0fdfa] dark:border-teal-900 dark:text-[#5eead4] dark:hover:bg-teal-950"
          >
            Start converting free
          </Link>
        </section>

        <section className="rounded-2xl border-2 border-[#0d9488] bg-[#f0fdfa] p-6 dark:border-teal-700 dark:bg-teal-950">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Premium</h2>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            For heavy use. Price shown at checkout.
          </p>
          <ul className="mt-4 space-y-2 text-slate-700 dark:text-slate-200">
            {premiumFeatures.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <div className="mt-6">
            {!supabaseUser ? (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Sign in first — Premium is attached to your account.
                </p>
                <Link
                  href="/signin"
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]"
                >
                  Sign in to upgrade
                </Link>
              </div>
            ) : !configured ? (
              <p className="text-slate-600 dark:text-slate-300">
                Premium checkout is not configured yet. Please try again later.
              </p>
            ) : (
              <CheckoutButton alreadyPremium={plan === "PREMIUM"} canBuy={canBuy} />
            )}
          </div>
        </section>
      </div>

      <section className="mt-10" aria-label="Frequently asked questions">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[#99f6e4] bg-white p-4 dark:border-teal-900 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">Why is no price listed here?</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              The price lives in Paddle, the payment provider, and is shown at the secure checkout.
              Listing a number here that could drift out of sync would be misleading.
            </p>
          </div>
          <div className="rounded-xl border border-[#99f6e4] bg-white p-4 dark:border-teal-900 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">What counts as one conversion?</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              One conversion run — one file converted, one merge, one OCR job — regardless of how
              many pages it has.
            </p>
          </div>
          <div className="rounded-xl border border-[#99f6e4] bg-white p-4 dark:border-teal-900 dark:bg-slate-900">
            <h3 className="font-bold text-slate-900 dark:text-white">Do I need an account?</h3>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              No. Guests get around {guestQuota} conversions a day as a fair-use guideline. Signing in (free)
              raises that to a tracked {freeQuota} a day and unlocks Premium.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10" aria-label="All tools">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">All tools are included</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TOOLS.map((t) => (
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
    </main>
  );
}
