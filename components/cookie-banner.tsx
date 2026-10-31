"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem("pth-cookie-choice")) setShow(true); } catch { /* ignore */ }
  }, []);
  if (!show) return null;
  const choose = (v: string) => { try { localStorage.setItem("pth-cookie-choice", v); } catch { /* ignore */ } setShow(false); };
  return (
    <div role="dialog" aria-label="Cookie choice" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border-2 border-[#99f6e4] bg-white p-4 dark:border-teal-800 dark:bg-slate-900">
      <p className="font-bold">Cookies</p>
      <p className="mt-1 text-slate-600 dark:text-slate-300">We use only essential cookies and anonymous analytics. Accept or decline — the tools work either way.</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={() => choose("accepted")}>Accept</Button>
        <Button variant="outline" onClick={() => choose("declined")}>Decline</Button>
      </div>
    </div>
  );
}
