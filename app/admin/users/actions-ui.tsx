"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { suspendUser, unsuspendUser, deleteUser, changePlan, resetLimits } from "../actions";

export function SearchBox({ initial }: { initial: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = ref.current?.value ?? "";
        router.push(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
    >
      <label htmlFor="user-search" className="block font-bold">Search users (press / to focus)</label>
      <input
        id="user-search"
        ref={ref}
        defaultValue={initial}
        placeholder="Name or email"
        className="mt-1 min-h-[44px] w-full max-w-md rounded-lg border-2 border-[#99f6e4] px-3 py-2 dark:border-teal-800 dark:bg-slate-800"
      />
    </form>
  );
}

export function UserButtons({ userId, status, plan }: { userId: string; status: string; plan: string }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, label: string) => {
    if (busy) return;
    if (label === "delete" && !window.confirm("Delete this user and all their data? This cannot be undone.")) return;
    setBusy(true);
    const res = await fn();
    setMsg(res.ok ? "Done." : (res.error ?? "Failed."));
    setBusy(false);
    if (res.ok) window.location.reload();
  };
  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <Button variant="outline" onClick={() => void run(() => suspendUser(userId), "suspend")}>Suspend</Button>
      ) : (
        <Button variant="outline" onClick={() => void run(() => unsuspendUser(userId), "unsuspend")}>Unsuspend</Button>
      )}
      <Button variant="outline" onClick={() => void run(() => changePlan(userId, plan === "PREMIUM" ? "FREE" : "PREMIUM"), "plan")}>
        {plan === "PREMIUM" ? "Set Free" : "Set Premium"}
      </Button>
      <Button variant="outline" onClick={() => void run(() => resetLimits(userId), "reset")}>Reset limits</Button>
      <Button variant="outline" onClick={() => void run(() => deleteUser(userId), "delete")}>Delete</Button>
      {msg && <span role="status" className="self-center text-sm">{msg}</span>}
    </div>
  );
}
