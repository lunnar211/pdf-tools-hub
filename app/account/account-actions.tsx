"use client";
import { signOutBrowser } from "@/lib/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExportButton() {
  const [msg, setMsg] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        onClick={async () => {
          setMsg("Preparing export…");
          const res = await fetch("/api/account/export");
          if (!res.ok) {
            setMsg("Export is not available right now (database not configured or session expired).");
            return;
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "pdf-tools-hub-my-data.json";
          a.click();
          URL.revokeObjectURL(url);
          setMsg("Downloaded your data as JSON.");
        }}
      >
        Export my data
      </Button>
      {msg && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    </div>
  );
}

export function DeleteButton() {
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState("");
  if (!confirming) {
    return <Button variant="outline" onClick={() => setConfirming(true)}>Delete my account and data</Button>;
  }
  return (
    <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 dark:bg-red-950">
      <p className="font-bold">Delete everything?</p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
        This permanently deletes your profile, job history, subscriptions, payments, notes, and audit rows about
        you. It cannot be undone.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          onClick={async () => {
            setMsg("Deleting…");
            const res = await fetch("/api/account/delete", { method: "POST" });
            if (!res.ok) {
              setMsg("Delete failed. Please try again or contact support.");
              return;
            }
            await signOutBrowser();
            window.location.href = "/";
          }}
        >
          Yes, delete everything
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
      {msg && <p role="status" className="mt-2 text-sm">{msg}</p>}
    </div>
  );
}

export function CheckoutButton({ alreadyPremium, canBuy }: { alreadyPremium: boolean; canBuy: boolean }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (alreadyPremium) return <p className="font-semibold text-teal-700 dark:text-teal-300">You are on Premium.</p>;
  if (!canBuy) {
    return (
      <p className="text-slate-600 dark:text-slate-300">
        Paid plans need an account age of 18 or over (see onboarding). Free tools remain fully available.
      </p>
    );
  }
  return (
    <div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("Opening secure checkout…");
          const res = await fetch("/api/checkout", { method: "POST" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.checkoutUrl) {
            setMsg(data.error ?? "Checkout is not configured yet. Please try again later.");
            setBusy(false);
            return;
          }
          window.location.href = data.checkoutUrl as string;
        }}
      >
        {busy ? "Opening checkout…" : "Upgrade to Premium"}
      </Button>
      {msg && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    </div>
  );
}

export function SignOutButton() {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await signOutBrowser();
        window.location.href = "/";
      }}
    >
      Sign out
    </Button>
  );
}
