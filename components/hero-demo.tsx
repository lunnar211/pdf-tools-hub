// Real, interactive hero demo — replaces the fake CSS-bar document that
// was hidden on phones. Drop any PDF (or tap "Use the sample file") and
// the demo REALLY reads it in your browser: pdf-lib counts the pages,
// pdf.js pulls the first lines of text off page 1, and the paper stack
// shows the before/after. Nothing is uploaded; the sample file is
// generated on the spot with pdf-lib. Visible on every screen size.
"use client";
import { useRef, useState } from "react";
import { ArrowRight, Check, FileText, Loader2, Upload } from "lucide-react";
import { countPdfPages, fileToBytes, loadPdfLib, loadPdfjs } from "@/lib/pdf-client";
import { formatBytes } from "@/lib/file-detect";

type DemoResult = { name: string; size: number; pages: number; snippet: string };

export function HeroDemo() {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runDemo = async (file: File) => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const bytes = await fileToBytes(file);
      const pages = await countPdfPages(bytes);
      let snippet = "";
      try {
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const page = await doc.getPage(1);
        const text = await page.getTextContent();
        snippet = text.items
          .map((it) => ("str" in it ? it.str : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180);
      } catch {
        snippet = "";
      }
      setResult({ name: file.name, size: file.size, pages, snippet });
    } catch {
      setError("That file could not be read as a PDF. Try another one.");
    } finally {
      setBusy(false);
    }
  };

  const runSample = async () => {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const page = doc.addPage([595, 842]);
      page.drawText("PDF Tools Hub — sample page", { x: 60, y: 760, size: 20, font, color: rgb(0.06, 0.46, 0.43) });
      page.drawText("This is a real PDF, made in your browser just now.", { x: 60, y: 720, size: 13, font });
      page.drawText("Drop your own PDF on the tray to read its pages the same way.", { x: 60, y: 695, size: 13, font });
      page.drawText("No upload. No watermark. No account.", { x: 60, y: 670, size: 13, font });
      const bytes = await doc.save();
      await runDemo(new File([bytes as BlobPart], "sample.pdf", { type: "application/pdf" }));
    } catch {
      setError("The sample could not be made in this browser. Try dropping your own PDF.");
      setBusy(false);
    }
  };

  return (
    <div
      className="mx-auto w-full max-w-sm"
      aria-label="Try it: drop a PDF and see it read in your browser"
    >
      <p className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Try it here — no upload, no account
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void runDemo(f);
        }}
        className={`mt-3 block min-h-[132px] w-full rounded-lg border-2 border-dashed p-5 text-left transition-colors ${
          dragOver ? "border-[#0f766e] bg-[#f0fdfa] dark:bg-teal-950" : "border-[#99f6e4] bg-white dark:border-teal-800 dark:bg-slate-900"
        }`}
      >
        <span className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <Upload size={20} className="text-[#0f766e] dark:text-[#5eead4]" aria-hidden="true" />
          Drop a PDF onto this tray
        </span>
        <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
          or tap to pick one from your device. It is read in your browser — never uploaded.
        </span>
        <span className="mt-3 block font-mono text-xs text-slate-500 dark:text-slate-400">
          sample.pdf · 1 page · made on the spot
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Choose a PDF to try the demo"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void runDemo(f);
          e.target.value = "";
        }}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runSample()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-[#0d9488] px-4 py-2 font-semibold text-white hover:bg-[#0f766e] disabled:opacity-60"
        >
          {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
          Use the sample file
        </button>
        <a
          href="/pdf-to-word"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border-2 border-[#0d9488] px-4 py-2 font-semibold text-[#0f766e] hover:bg-white dark:text-[#5eead4]"
        >
          Convert a real file <ArrowRight size={18} aria-hidden="true" />
        </a>
      </div>

      {busy && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300" role="status">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Reading your PDF in this browser…
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-[#dc2626] bg-red-50 p-3 text-sm font-medium text-[#991b1b] dark:bg-red-950 dark:text-red-200" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-4">
          <div className="slide-paper rotate-1 rounded-lg border-2 border-[#99f6e4] bg-white p-4 shadow-sm dark:border-teal-800 dark:bg-slate-900">
            <p className="flex items-center gap-2 font-mono text-sm font-bold text-slate-900 dark:text-white">
              <FileText size={16} className="text-[#0f766e]" aria-hidden="true" />
              {result.name} · {result.pages} {result.pages === 1 ? "page" : "pages"} · {formatBytes(result.size)}
            </p>
            {result.snippet ? (
              <p className="mt-3 border-t border-dashed border-[#99f6e4] pt-3 text-sm text-slate-600 dark:border-teal-800 dark:text-slate-300">
                “{result.snippet}”
              </p>
            ) : (
              <p className="mt-3 border-t border-dashed border-[#99f6e4] pt-3 text-sm text-slate-600 dark:border-teal-800 dark:text-slate-300">
                Page 1 has no readable text layer (probably a scan) — the OCR tool can read it instead.
              </p>
            )}
            <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-[#0f766e] dark:text-[#5eead4]">
              <Check size={16} aria-hidden="true" /> Read in your browser — nothing uploaded
            </p>
          </div>
          <p className="stamp stamp-in mt-3">READ ✓ · {result.pages} {result.pages === 1 ? "PAGE" : "PAGES"}</p>
        </div>
      )}
    </div>
  );
}
