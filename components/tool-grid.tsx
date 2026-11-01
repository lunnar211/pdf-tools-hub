// Homepage tool grid with a search filter (client component so typing
// filters instantly without a round trip).
"use client";
import { useState } from "react";
import Link from "next/link";
import {
  FileText, FileDown, Image as ImageIcon, Combine, Scissors, Shrink,
  FileImage, RotateCw, LayoutGrid, Droplet, Hash, ScanText, ArrowRight,
} from "lucide-react";
import { TOOLS } from "@/lib/site";

const ICONS: Record<string, React.ReactNode> = {
  "file-text": <FileText size={30} aria-hidden="true" />,
  "file-down": <FileDown size={30} aria-hidden="true" />,
  image: <ImageIcon size={30} aria-hidden="true" />,
  combine: <Combine size={30} aria-hidden="true" />,
  scissors: <Scissors size={30} aria-hidden="true" />,
  shrink: <Shrink size={30} aria-hidden="true" />,
  "file-image": <FileImage size={30} aria-hidden="true" />,
  "rotate-cw": <RotateCw size={30} aria-hidden="true" />,
  "layout-grid": <LayoutGrid size={30} aria-hidden="true" />,
  droplet: <Droplet size={30} aria-hidden="true" />,
  hash: <Hash size={30} aria-hidden="true" />,
  "scan-text": <ScanText size={30} aria-hidden="true" />,
};

export function ToolGrid() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? TOOLS.filter((t) => `${t.title} ${t.short}`.toLowerCase().includes(q))
    : TOOLS;
  return (
    <div>
      <label htmlFor="tool-search" className="sr-only">
        Search tools
      </label>
      <input
        id="tool-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search tools — try “jpg”, “rotate”, or “watermark”…"
        className="mt-2 min-h-[44px] w-full max-w-xl rounded-lg border-2 border-[#99f6e4] bg-white px-4 py-2 text-slate-900 dark:border-teal-800 dark:bg-slate-800 dark:text-white"
      />
      {visible.length === 0 ? (
        <p className="mt-6 text-slate-600 dark:text-slate-300" role="status">
          No tool matches “{query}”. Try “pdf”, “image”, or “pages”.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <Link
              key={t.slug}
              href={`/${t.slug}`}
              className="group rounded-2xl border-2 border-[#99f6e4] bg-white p-5 transition-colors duration-150 hover:border-[#0d9488] dark:border-teal-900 dark:bg-slate-900 dark:hover:border-teal-600"
            >
              <span className="inline-flex rounded-lg bg-[#f0fdfa] p-3 text-[#0d9488] dark:bg-teal-950 dark:text-[#5eead4]">
                {ICONS[t.icon]}
              </span>
              <span className="mt-3 block text-xl font-bold text-slate-900 dark:text-white">{t.title}</span>
              <span className="mt-1 block text-slate-600 dark:text-slate-300">{t.short}</span>
              <span className="mt-3 inline-flex min-h-[44px] items-center gap-1 font-semibold text-[#ea580c]">
                Use this tool <ArrowRight size={18} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
