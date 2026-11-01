// Shared success screen for browser tools: download, size, "convert more",
// and contextual next-tool suggestions.
"use client";
import { Download } from "lucide-react";
import { Button } from "./ui/button";
import { NextToolSuggest } from "./next-tool-suggest";
import { formatBytes } from "@/lib/file-detect";
import type { ToolSlug } from "@/lib/site";

export function ToolResult({
  tool,
  resultLabel,
  name,
  size,
  url,
  note,
  onReset,
}: {
  tool: ToolSlug;
  resultLabel: string;
  name: string;
  size: number;
  url: string;
  note?: string;
  onReset: () => void;
}) {
  return (
    <div
      className="rounded-2xl border-2 border-[#0d9488] bg-[#f0fdfa] p-5 dark:border-teal-700 dark:bg-teal-950"
      role="status"
    >
      <p className="text-lg font-bold text-slate-900 dark:text-white">Conversion complete</p>
      <p className="mt-2 text-slate-700 dark:text-slate-200">
        {resultLabel}: {name} ({formatBytes(size)})
      </p>
      {note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{note}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={url}
          download={name}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]"
        >
          <Download size={18} aria-hidden="true" /> Download result
        </a>
        <Button type="button" onClick={onReset}>
          Convert more
        </Button>
      </div>
      <NextToolSuggest tool={tool} />
    </div>
  );
}
