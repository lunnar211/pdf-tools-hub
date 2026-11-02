"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { signInWithEmail } from "@/lib/supabase/email-signin";
import { buildAuthCallbackUrl } from "@/lib/supabase/callback-url";

export function SigninForm({ configured, next }: { configured: boolean; next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  if (!configured) {
    return (
      <div role="status" className="rounded-xl border-2 border-[#ea580c] bg-orange-50 p-5 dark:bg-orange-950">
        <p className="font-bold">Sign-in is not configured yet</p>
        <p className="mt-1 text-slate-700 dark:text-slate-200">
          Google sign-in has not been set up for this site yet. The PDF tools still work without an account.
        </p>
      </div>
    );
  }
  return (
    <div>
      <Button
        onClick={async () => {
          setBusy(true);
          setError("");
          const supabase = createSupabaseBrowserClient();
          if (!supabase) {
            setError("Sign-in is not configured yet.");
            setBusy(false);
            return;
          }
          // Supabase Auth Google OAuth. redirectTo is this site's own
          // /auth/callback, built from window.location.origin (never from
          // user input or Supabase's Site URL setting); `next` inside it
          // is re-validated by buildAuthCallbackUrl, and /auth/callback
          // validates it a third time before redirecting.
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: buildAuthCallbackUrl(window.location.origin, next) },
          });
          if (error) {
            setError("Could not start Google sign-in. Please try again.");
            setBusy(false);
          }
        }}
        disabled={busy}
        className="w-full"
      >
        {busy ? "Redirecting to Google…" : "Sign in with Google"}
      </Button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#99f6e4] dark:bg-teal-900" />
        <span className="text-sm text-slate-500 dark:text-slate-400">or sign in with email</span>
        <span className="h-px flex-1 bg-[#99f6e4] dark:bg-teal-900" />
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const supabase = createSupabaseBrowserClient();
          if (!supabase) {
            setError("Sign-in is not configured yet.");
            setBusy(false);
            return;
          }
          // Email + password via Supabase Auth (see
          // lib/supabase/email-signin.ts for the tested behavior: trimmed
          // email, blank inputs refused locally, every failure mapped to
          // one generic message). The account itself is created by the
          // site owner in the Supabase dashboard (never in chat, never in
          // code); the Email provider must be enabled there.
          const result = await signInWithEmail(supabase, email, password);
          if (!result.ok) {
            setError(result.message);
            setBusy(false);
            return;
          }
          router.push(next);
          router.refresh();
        }}
      >
        <div>
          <label htmlFor="signin-email" className="font-semibold">Email address</label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2.5 dark:border-teal-900 dark:bg-slate-900"
          />
        </div>
        <div className="mt-4">
          <label htmlFor="signin-password" className="font-semibold">Password</label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2.5 dark:border-teal-900 dark:bg-slate-900"
          />
        </div>
        <Button type="submit" variant="outline" disabled={busy} className="mt-4 w-full">
          {busy ? "Signing in…" : "Sign in with email"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Email accounts are created by the site owner in the Supabase dashboard. No password is ever stored on
        this site itself.
      </p>
    </div>
  );
}
