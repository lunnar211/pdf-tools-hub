"use client";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitOnboarding } from "./actions";

export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (blocked === "blocked-13-15") {
    return (
      <div role="status" className="rounded-xl border-2 border-[#ea580c] bg-orange-50 p-5 dark:bg-orange-950">
        <p className="font-bold">This account cannot be activated yet</p>
        <p className="mt-1 text-slate-700 dark:text-slate-200">
          Accounts can only be activated from age 16. Your account is blocked until then, and you cannot use
          signed-in features. You can still use the PDF tools without signing in.
        </p>
      </div>
    );
  }
  return (
    <form
      className="space-y-4 rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await submitOnboarding(new FormData(e.currentTarget));
        setBusy(false);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        if (res.gate === "deleted-under13") {
          await signOut({ callbackUrl: "/" });
          return;
        }
        if (res.gate === "blocked-13-15") {
          setBlocked("blocked-13-15");
          return;
        }
        router.push("/account");
      }}
    >
      <div>
        <label htmlFor="dob" className="block font-bold">Date of birth</label>
        <input id="dob" name="dob" type="date" required
          className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800" />
      </div>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="confirm" required className="mt-1 h-5 w-5" />
        <span>I confirm the age I entered is correct.</span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="terms" required className="mt-1 h-5 w-5" />
        <span>
          I accept the <a href="/terms" className="underline">Terms</a> and have read the{" "}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </span>
      </label>
      {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Continue"}</Button>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No ID document is needed — this is self-declaration only, and we store only your date of birth. Under-13
        accounts are deleted, not kept. Ages 16–17 get a free account only; paid plans need age 18 or over.
      </p>
    </form>
  );
}
