"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startTotpSetup, verifyTotpSetup } from "./actions";

export function SetupForm() {
  const router = useRouter();
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-4">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          const res = await startTotpSetup();
          setBusy(false);
          if (!res.ok) {
            setMsg(res.error ?? "Failed.");
            return;
          }
          setQr(res.qr ?? "");
          setUrl(res.url ?? "");
        }}
      >
        Generate QR code
      </Button>
      {qr && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code for your authenticator app" width={220} height={220} />
          <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">
            Or enter this key by hand in your authenticator app: <code>{url}</code>
          </p>
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const res = await verifyTotpSetup(code);
              setBusy(false);
              if (!res.ok) {
                setMsg(res.error ?? "Failed.");
                return;
              }
              router.push("/admin");
            }}
          >
            <label htmlFor="code" className="sr-only">6-digit code from your authenticator app</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="123456"
              className="min-h-[44px] rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800"
            />
            <Button type="submit" disabled={busy}>Verify and enable 2FA</Button>
          </form>
        </div>
      )}
      {msg && <p role="status" className="text-red-700 dark:text-red-300">{msg}</p>}
    </div>
  );
}
