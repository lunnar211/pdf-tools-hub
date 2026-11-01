// Add watermark (browser): one diagonal text watermark, centred, on every page.
"use client";
import { useState } from "react";
import { SimplePdfTool } from "./simple-pdf-tool";
import { fileToBytes, watermarkPdf } from "@/lib/pdf-client";

const SELECT_CLASS =
  "min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 text-slate-900 dark:border-teal-800 dark:bg-slate-800 dark:text-white";

export function WatermarkTool() {
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState("0.3");
  const [size, setSize] = useState("72");
  const [color, setColor] = useState("#808080");

  return (
    <SimplePdfTool
      tool="watermark-pdf"
      resultLabel="Your watermarked PDF"
      convertLabel="Add watermark"
      optionsNode={
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="wm-text" className="block font-bold text-slate-900 dark:text-white">
              Watermark text
            </label>
            <input
              id="wm-text"
              value={text}
              maxLength={60}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. DRAFT, CONFIDENTIAL"
              className={`mt-1 ${SELECT_CLASS}`}
            />
          </div>
          <div>
            <label htmlFor="wm-opacity" className="block font-bold text-slate-900 dark:text-white">
              Strength
            </label>
            <select id="wm-opacity" value={opacity} onChange={(e) => setOpacity(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
              <option value="0.15">Light (faint)</option>
              <option value="0.3">Medium</option>
              <option value="0.5">Strong</option>
            </select>
          </div>
          <div>
            <label htmlFor="wm-size" className="block font-bold text-slate-900 dark:text-white">
              Text size
            </label>
            <select id="wm-size" value={size} onChange={(e) => setSize(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
              <option value="48">Small</option>
              <option value="72">Medium</option>
              <option value="96">Large</option>
            </select>
          </div>
          <div>
            <label htmlFor="wm-color" className="block font-bold text-slate-900 dark:text-white">
              Colour
            </label>
            <select id="wm-color" value={color} onChange={(e) => setColor(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
              <option value="#808080">Grey</option>
              <option value="#dc2626">Red</option>
              <option value="#0f766e">Teal</option>
              <option value="#1d4ed8">Blue</option>
            </select>
          </div>
        </div>
      }
      onConvert={async (file) => {
        if (!text.trim()) throw new Error("Type the watermark text first.");
        const bytes = await fileToBytes(file);
        const out = await watermarkPdf(bytes, {
          text: text.trim(),
          opacity: Number(opacity),
          size: Number(size),
          color,
        });
        return {
          blob: new Blob([out as unknown as BlobPart], { type: "application/pdf" }),
          filename: file.name.replace(/\.pdf$/i, "") + "-watermarked.pdf",
        };
      }}
    />
  );
}
