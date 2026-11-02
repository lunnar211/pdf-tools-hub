import type { Metadata } from "next";
import { SigninForm } from "./signin-form";
import { validateNext } from "@/lib/redirect";

export const metadata: Metadata = {
  title: "Sign in | PDF Tools Hub",
  description: "Sign in to PDF Tools Hub with Google or email for higher limits and job history.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Supabase Auth (Google + email providers, owner's existing "LeadForge" project).
// The `next` param is validated here AND again in /auth/callback, so a
// crafted /signin?next=https://evil.example can never redirect off-site.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const next = validateNext(params.next);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Sign in</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Sign in with Google, or with an email account created by the site owner, for higher daily limits, job
        history, and an account page. Guests can still use every tool with the free daily limit — no account is
        required.
      </p>
      {params.error === "signin_failed" && (
        <div role="alert" className="mt-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:bg-red-950">
          <p className="font-bold">Sign-in did not complete</p>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">Please try again. If it keeps failing, contact support.</p>
        </div>
      )}
      <div className="mt-6">
        <SigninForm configured={configured} next={next} />
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        We ask Google only for your name, email address, and profile photo (openid, email, profile). We never see
        your Google password. Email sign-in uses the password set by the site owner in the Supabase dashboard;
        this site never stores your password. See the <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </main>
  );
}
