"use client";
import { useEffect, useState } from "react";

// Ad slot: renders NOTHING unless ALL of these hold — an AdSense publisher id
// is set (only after approval), the visitor accepted cookies, and ads are not
// switched off in admin settings. Ads never appear on /signin, /admin, or
// /account because AdSlot is only placed on public pages (currently the home page).
export function AdSlot() {
  const id = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let consent = false;
    try { consent = localStorage.getItem("pth-cookie-choice") === "accepted"; } catch { consent = false; }
    if (!id || !consent) return;
    fetch("/api/public-settings")
      .then((r) => r.json())
      .then((d) => { if (d.adsEnabled !== false) setShow(true); })
      .catch(() => undefined);
  }, [id]);
  if (!id || !show) return null;
  return (
    <div role="complementary" aria-label="Advertisement" data-adsense-publisher={id}
      className="mx-auto my-8 flex min-h-[90px] max-w-3xl items-center justify-center rounded-xl border-2 border-dashed border-[#99f6e4] bg-white text-sm text-slate-500 dark:bg-slate-900">
      Advertisement
    </div>
  );
}
