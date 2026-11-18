// Distinct header treatment per tool family — kills the "every page is
// the same template" problem. Same content underneath, different staging:
//  - convert: an IN → OUT paper stack (source sheet becomes result sheet)
//  - organise: a loose page-strip of numbered sheets
//  - image: a tilted photo-tray
// Every masthead ends with a mono "receipt" line (file-type details in
// typewriter style) and a rubber stamp instead of a pill badge.
import type { ToolFamily } from "@/lib/tool-content";
import { ArrowRight, FileText, Image as ImageIcon, Layers } from "lucide-react";

const FAMILY: Record<ToolFamily, { label: string; stamp: string; accent: string }> = {
  convert: { label: "Convert", stamp: "IN → OUT", accent: "#0f766e" },
  organise: { label: "Organise", stamp: "LOOSE SHEETS", accent: "#c2410c" },
  image: { label: "Images", stamp: "PHOTO TRAY", accent: "#0f766e" },
};

export function ToolMasthead({
  family,
  title,
  description,
  limits,
  receipt,
}: {
  family: ToolFamily;
  title: string;
  description: string;
  limits: string;
  receipt: string;
}) {
  const f = FAMILY[family];
  return (
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <span className="stamp">{f.stamp}</span>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {f.label} · free tool
        </span>
      </div>

      {family === "convert" && (
        <div aria-hidden="true" className="mt-5 flex items-center gap-2">
          <span className="flex min-h-[44px] items-center gap-2 rounded-md border-2 border-[#99f6e4] bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 dark:border-teal-800 dark:bg-slate-900 dark:text-slate-100">
            <FileText size={16} className="text-[#0f766e]" /> IN
          </span>
          <ArrowRight size={20} className="text-[#c2410c]" aria-hidden="true" />
          <span className="flex min-h-[44px] -rotate-1 items-center gap-2 rounded-md border-2 border-[#ea580c] bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 dark:border-orange-800 dark:bg-slate-900 dark:text-slate-100">
            OUT
          </span>
        </div>
      )}
      {family === "organise" && (
        <div aria-hidden="true" className="mt-5 flex items-center gap-1">
          {[1, 2, 3, 4].map((n, i) => (
            <span
              key={n}
              className="flex h-11 w-9 items-end justify-center rounded-sm border border-[#99f6e4] bg-white pb-1 font-mono text-xs font-bold text-[#0f766e] shadow-sm dark:border-teal-800 dark:bg-slate-900 dark:text-[#5eead4]"
              style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }}
            >
              {n}
            </span>
          ))}
          <span className="ml-2 font-mono text-xs text-slate-500 dark:text-slate-400">loose sheets —<br />put them in order</span>
        </div>
      )}
      {family === "image" && (
        <div aria-hidden="true" className="mt-5 flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-[#99f6e4] bg-white shadow-sm dark:border-teal-800 dark:bg-slate-900"
              style={{ transform: `rotate(${(i - 1) * 5}deg)` }}
            >
              <ImageIcon size={20} className="text-[#0f766e] dark:text-[#5eead4]" />
            </span>
          ))}
          <Layers size={20} className="ml-1 text-[#c2410c]" aria-hidden="true" />
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">one PDF<br />at the end</span>
        </div>
      )}

      <h1 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600 dark:text-slate-300">{description}</p>
      <p className="mt-2 font-mono text-sm text-slate-600 dark:text-slate-300">{receipt}</p>
      <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{limits}</p>
    </header>
  );
}
