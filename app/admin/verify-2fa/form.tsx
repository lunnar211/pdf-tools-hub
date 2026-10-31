"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { verifyTotpChallenge } from "../setup-2fa/actions";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg("");
        const res = await verifyTotpChallenge(code);
        setBusy(false);
        if (!res.ok) {
          setMsg(res.error ?? "Failed.");
          return;
        }
        router.push("/admin");
      }}
    >
      <div>
        <label htmlFor="code" className="block font-bold">6-digit code from your authenticator app</label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          placeholder="123456"
          className="mt-1 min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800"
        />
      </div>
      {msg && <p role="alert" className="text-red-700 dark:text-red-300">{msg}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Verify and continue"}</Button>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Verification lasts 12 hours. After that you will be asked again. If you have not set up 2FA yet, go to{" "}
        <a href="/admin/setup-2fa" className="underline">2FA setup</a>.
      </p>
    </form>
  );
}
