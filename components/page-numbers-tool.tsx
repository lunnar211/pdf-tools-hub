// Add page numbers (browser): "Page X of Y" at the foot of every page.
"use client";
import { useState } from "react";
import { SimplePdfTool } from "./simple-pdf-tool";
import { fileToBytes, addPageNumbers } from "@/lib/pdf-client";

const SELECT_CLASS =
  "min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 text-slate-900 dark:border-teal-800 dark:bg-slate-800 dark:text-white";

export function PageNumbersTool() {
  const [position, setPosition] = useState<"center" | "right">("center");
  const [size, setSize] = useState("12");
  const [startAt, setStartAt] = useState("1");

  return (
    <SimplePdfTool
      tool="page-numbers"
      resultLabel="Your numbered PDF"
      convertLabel="Add page numbers"
      optionsNode={
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="pn-position" className="block font-bold text-slate-900 dark:text-white">
              Position
            </label>
            <select
              id="pn-position"
              value={position}
              onChange={(e) => setPosition(e.target.value as "center" | "right")}
              className={`mt-1 ${SELECT_CLASS}`}
            >
              <option value="center">Bottom centre</option>
              <option value="right">Bottom right</option>
            </select>
          </div>
          <div>
            <label htmlFor="pn-size" className="block font-bold text-slate-900 dark:text-white">
              Text size
            </label>
            <select id="pn-size" value={size} onChange={(e) => setSize(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
              <option value="10">Small</option>
              <option value="12">Medium</option>
              <option value="14">Large</option>
            </select>
          </div>
          <div>
            <label htmlFor="pn-start" className="block font-bold text-slate-900 dark:text-white">
              First page number
            </label>
            <input
              id="pn-start"
              type="number"
              min={1}
              max={9999}
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className={`mt-1 ${SELECT_CLASS}`}
            />
            <p className="mt-1 text-sm text-slate-500">Use 1 normally; a higher number skips front matter.</p>
          </div>
        </div>
      }
      onConvert={async (file) => {
        const start = Math.max(1, Math.min(9999, parseInt(startAt, 10) || 1));
        const bytes = await fileToBytes(file);
        const out = await addPageNumbers(bytes, { position, size: Number(size), startAt: start });
        return {
          blob: new Blob([out as unknown as BlobPart], { type: "application/pdf" }),
          filename: file.name.replace(/\.pdf$/i, "") + "-numbered.pdf",
        };
      }}
    />
  );
}
