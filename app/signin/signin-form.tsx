"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SigninForm({ configured, next }: { configured: boolean; next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
          // /auth/callback, which validates `next` again before redirecting.
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
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
    </div>
  );
}
