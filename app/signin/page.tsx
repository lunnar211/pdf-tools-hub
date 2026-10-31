import type { Metadata } from "next";
import { SigninForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Sign in | PDF Tools Hub",
  description: "Sign in to PDF Tools Hub with Google for higher limits and job history.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function Page() {
  const configured = Boolean(process.env.AUTH_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Sign in</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">
        Sign in with Google for higher daily limits, job history, and an account page. Guests can still use every
        tool with the free daily limit — no account is required.
      </p>
      <div className="mt-6">
        <SigninForm configured={configured} />
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        We ask Google only for your name, email address, and profile photo (openid, email, profile). We never see
        your Google password. See the <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </main>
  );
}
