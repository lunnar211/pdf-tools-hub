// PDF to JPG (browser): render each page to a JPG. One page → a single
// .jpg download; several pages → a .zip of page images.
"use client";
import { useState } from "react";
import { SimplePdfTool } from "./simple-pdf-tool";
import { fileToBytes, renderPdfPagesToJpegs } from "@/lib/pdf-client";

const SELECT_CLASS =
  "min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 text-slate-900 dark:border-teal-800 dark:bg-slate-800 dark:text-white";

export function PdfToJpgTool() {
  const [scale, setScale] = useState("1.5");
  const [quality, setQuality] = useState("0.92");

  return (
    <SimplePdfTool
      tool="pdf-to-jpg"
      resultLabel="Your JPG images"
      convertLabel="Convert to JPG"
      optionsNode={
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="jpg-scale" className="block font-bold text-slate-900 dark:text-white">
              Image detail
            </label>
            <select id="jpg-scale" value={scale} onChange={(e) => setScale(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
              <option value="1">Standard (screen size)</option>
              <option value="1.5">Higher (good for printing)</option>
              <option value="2">High (large files)</option>
            </select>
          </div>
          <div>
            <label htmlFor="jpg-quality" className="block font-bold text-slate-900 dark:text-white">
              JPG quality
            </label>
            <select id="jpg-quality" value={quality} onChange={(e) => setQuality(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
              <option value="0.8">Good (smaller files)</option>
              <option value="0.92">Best (larger files)</option>
            </select>
          </div>
        </div>
      }
      onConvert={async (file, onProgress) => {
        const bytes = await fileToBytes(file);
        const pages = await renderPdfPagesToJpegs(bytes, Number(scale), Number(quality), (done, total) => {
          onProgress(`Rendering page ${done} of ${total}…`);
        });
        const base = file.name.replace(/\.pdf$/i, "");
        if (pages.length === 1) {
          return { blob: pages[0], filename: `${base}.jpg` };
        }
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        pages.forEach((blob, i) => {
          zip.file(`${base}-page-${i + 1}.jpg`, blob);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        return { blob: zipBlob, filename: `${base}-pages.zip` };
      }}
    />
  );
}
