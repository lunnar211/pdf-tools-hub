"use client";
import { useEffect, useState } from "react";

export function AnnouncementBanner() {
  const [text, setText] = useState("");
  useEffect(() => {
    fetch("/api/public-settings")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.announcement === "string" && d.announcement.trim()) setText(d.announcement.trim());
      })
      .catch(() => undefined);
  }, []);
  if (!text) return null;
  return (
    <div role="status" className="bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white">
      {text}
    </div>
  );
}
