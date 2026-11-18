// Homepage tool grid with a search filter (client component so typing
// filters instantly without a round trip). Staged as a workbench: tools
// sit in three trays (Convert / Organise / Images) as file-folder tabs
// with dog-eared corners and different widths — not 13 identical cards.
"use client";
import { useState } from "react";
import Link from "next/link";
import {
  FileText, FileDown, Image as ImageIcon, Combine, Scissors, Shrink,
  FileImage, RotateCw, LayoutGrid, Droplet, Hash, ScanText, Pencil, ArrowRight,
} from "lucide-react";
import { TOOLS, type ToolFamily } from "@/lib/site";

const ICONS: Record<string, React.ReactNode> = {
  "file-text": <FileText size={30} aria-hidden="true" />,
  "pencil": <Pencil size={30} aria-hidden="true" />,
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

const TRAYS: { family: ToolFamily; label: string; note: string }[] = [
  { family: "convert", label: "Convert tray", note: "one format in, another out" },
  { family: "organise", label: "Organise tray", note: "same file, better order" },
  { family: "image", label: "Photo tray", note: "pictures become pages" },
];

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
        placeholder="Search tools — try “jpg” or “rotate”…"
        className="mt-2 min-h-[44px] w-full max-w-xl rounded-lg border-2 border-[#99f6e4] bg-white px-4 py-2 text-slate-900 dark:border-teal-800 dark:bg-slate-800 dark:text-white"
      />
      {visible.length === 0 ? (
        <p className="mt-6 text-slate-600 dark:text-slate-300" role="status">
          No tool matches “{query}”. Try “pdf”, “image”, or “pages”.
        </p>
      ) : q ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <ToolCard key={t.slug} slug={t.slug} title={t.title} short={t.short} icon={t.icon} />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {TRAYS.map((tray) => {
            const tools = visible.filter((t) => t.family === tray.family);
            if (tools.length === 0) return null;
            return (
              <section key={tray.family} aria-label={tray.label}>
                <div className="flex items-baseline gap-3 border-b-2 border-[#0f766e] pb-2">
                  <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-[#0f766e] dark:text-[#5eead4]">{tray.label}</h3>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{tray.note}</span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((t, i) => (
                    <ToolCard key={t.slug} slug={t.slug} title={t.title} short={t.short} icon={t.icon} wide={i === 0} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ToolCard({ slug, title, short, icon, wide = false }: { slug: string; title: string; short: string; icon: string; wide?: boolean }) {
  return (
    <Link
      href={`/${slug}`}
      className={`dog-ear group rounded-lg border-2 border-[#99f6e4] bg-white p-5 transition-colors duration-150 hover:border-[#0d9488] dark:border-teal-900 dark:bg-slate-900 dark:hover:border-teal-600 ${wide ? "sm:col-span-2 lg:col-span-1" : ""}`}
    >
      <span className="inline-flex rounded-md bg-[#f0fdfa] p-3 text-[#0d9488] dark:bg-teal-950 dark:text-[#5eead4]">
        {ICONS[icon]}
      </span>
      <span className="mt-3 block text-xl font-bold text-slate-900 dark:text-white">{title}</span>
      <span className="mt-1 block text-slate-600 dark:text-slate-300">{short}</span>
      <span className="mt-3 inline-flex min-h-[44px] items-center gap-1 font-semibold text-[#c2410c] dark:text-[#fb923c]">
        Use this tool <ArrowRight size={18} aria-hidden="true" />
      </span>
    </Link>
  );
}
