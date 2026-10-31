"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SigninForm({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
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
    <Button
      onClick={() => {
        setBusy(true);
        void signIn("google", { callbackUrl: "/account" });
      }}
      disabled={busy}
      className="w-full"
    >
      {busy ? "Redirecting to Google…" : "Sign in with Google"}
    </Button>
  );
}
