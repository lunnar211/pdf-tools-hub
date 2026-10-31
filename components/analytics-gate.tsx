"use client";
import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";

// Vercel Analytics renders ONLY after the visitor accepts cookies.
// The cookie banner dispatches a "pth-consent" event when the choice changes.
export function AnalyticsGate() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        setAllowed(localStorage.getItem("pth-cookie-choice") === "accepted");
      } catch {
        setAllowed(false);
      }
    };
    check();
    window.addEventListener("pth-consent", check);
    return () => window.removeEventListener("pth-consent", check);
  }, []);
  if (!allowed) return null;
  return <Analytics />;
}
