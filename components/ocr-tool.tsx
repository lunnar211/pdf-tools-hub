// OCR (browser): scanned PDF → searchable PDF + extracted text. English
// only, first 10 pages (browser OCR is slow — roughly 10–30 seconds per
// page on a phone). Runs fully on-device via Tesseract.js, loaded on demand.
"use client";
import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Download, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { UploadZone } from "./upload-zone";
import { LimitCounter } from "./limit-counter";
import { ToolResult } from "./tool-result";
import { PDF_KINDS, formatBytes } from "@/lib/file-detect";
import { fileToBytes, renderPdfPagesToJpegs, countPdfPages } from "@/lib/pdf-client";
import { recognizeImage, buildSearchablePdf, terminateOcrWorker, type OcrPageResult } from "@/lib/ocr";
import { countToolUse, downloadBlob, saveToHistory } from "@/lib/client-tool";

export const OCR_PAGE_CAP = 10;

export function OcrTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);

  useEffect(() => {
    return () => {
      void terminateOcrWorker();
    };
  }, []);

  const handleFiles = (next: File[]) => {
    setFiles(next);
    setPageCount(null);
    setText(null);
    setResult(null);
    setError("");
    if (next[0]) {
      fileToBytes(next[0])
        .then((b) => countPdfPages(b))
        .then((n) => setPageCount(n))
        .catch(() => setPageCount(null));
    }
  };

  const reset = () => {
    if (result?.url.startsWith("blob:")) URL.revokeObjectURL(result.url);
    setResult(null);
    setFiles([]);
    setPageCount(null);
    setText(null);
    setError("");
    void terminateOcrWorker();
  };

  const run = async () => {
    const file = files[0];
    if (!file) return;
    setError("");
    setBusy(true);
    setText(null);
    setProgressText("Checking your daily limit…");
    const blocked = await countToolUse("ocr-pdf");
    if (blocked) {
      setError(blocked);
      setBusy(false);
      return;
    }
    try {
      const bytes = await fileToBytes(file);
      const total = await countPdfPages(bytes);
      const pagesToDo = Math.min(total, OCR_PAGE_CAP);
      setProgressText(`Rendering ${pagesToDo} page${pagesToDo > 1 ? "s" : ""}…`);
      const images = await renderPdfPagesToJpegs(bytes, 2, 0.92, (done, tot) => {
        setProgressText(`Rendering page ${done} of ${tot}…`);
      });
      const todo = images.slice(0, pagesToDo);
      const results: { image: Blob; ocr: OcrPageResult }[] = [];
      for (let i = 0; i < todo.length; i++) {
        setProgressText(`Reading text on page ${i + 1} of ${todo.length}… (this can take a while)`);
        const ocr = await recognizeImage(todo[i], (status, progress) => {
          if (status === "recognizing text") {
            setProgressText(`Reading text on page ${i + 1} of ${todo.length}… ${Math.round(progress * 100)}%`);
          } else if (status.includes("loading")) {
            setProgressText(`Loading the text reader… ${Math.round(progress * 100)}%`);
          }
        });
        results.push({ image: todo[i], ocr });
      }
      setProgressText("Building your searchable PDF…");
      const out = await buildSearchablePdf(results);
      const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-searchable.pdf";
      const fullText = results
        .map((r, i) => `--- Page ${i + 1} ---\n${r.ocr.text.trim()}`)
        .join("\n\n");
      setText(fullText);
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
      setCounterKey((k) => k + 1);
      void saveToHistory("ocr-pdf", name, blob);
      downloadBlob(blob, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const downloadTxt = () => {
    if (text === null) return;
    const base = (files[0]?.name ?? "document").replace(/\.pdf$/i, "");
    downloadBlob(new Blob([text], { type: "text/plain" }), `${base}-text.txt`);
  };

  const copyText = async () => {
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed — select the text manually instead.");
    }
  };

  return (
    <div className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
      <UploadZone
        files={files}
        onFilesChange={handleFiles}
        accept=".pdf,application/pdf"
        allowedKinds={PDF_KINDS}
        maxBytes={25 * 1024 * 1024}
        maxFiles={1}
        multiple={false}
        label="Choose a scanned PDF"
        hint="One PDF, up to 25 MB. Drop, paste (Ctrl+V), or browse."
      />
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Runs in your browser — your file never leaves this device. English text only, first{" "}
        {OCR_PAGE_CAP} pages. Accuracy depends on scan quality; handwriting is not recognised well.
      </p>
      <div className="mt-3">
        <LimitCounter refreshKey={counterKey} />
      </div>
      {pageCount !== null && pageCount > OCR_PAGE_CAP && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-slate-700 dark:bg-amber-950 dark:text-slate-200">
          This PDF has {pageCount} pages. Only the first {OCR_PAGE_CAP} will be recognised, because
          browser OCR is slow.
        </p>
      )}
      {files[0] && (
        <div className="mt-5">
          <Button type="button" variant="accent" onClick={() => void run()} disabled={busy}>
            {busy && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
            {busy ? "Reading text…" : "Make searchable"}
          </Button>
          {busy && progressText && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
              {progressText}
            </p>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-[#dc2626] bg-red-50 p-3 font-medium text-[#991b1b] dark:bg-red-950 dark:text-red-200">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> {error}
        </p>
      )}
      {result && text !== null && (
        <div className="mt-5">
          <ToolResult
            tool="ocr-pdf"
            resultLabel="Your searchable PDF"
            name={result.name}
            size={result.size}
            url={result.url}
            note="The searchable PDF looks like the original scan, but its text can now be searched and copied. It is also saved for 1-hour re-download on your Account page."
            onReset={reset}
          />
          <div className="mt-5">
            <h3 className="font-bold text-slate-900 dark:text-white">Recognised text</h3>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-[#99f6e4] bg-slate-50 p-4 text-sm text-slate-800 dark:border-teal-900 dark:bg-slate-800 dark:text-slate-200">
              {text}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={downloadTxt}>
                <Download size={16} aria-hidden="true" /> Download as .txt
              </Button>
              <Button type="button" onClick={() => void copyText()}>
                <Copy size={16} aria-hidden="true" /> {copied ? "Copied!" : "Copy text"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {files[0] && (
        <p className="mt-3 text-sm text-slate-500">
          Selected: {files[0].name} ({formatBytes(files[0].size)})
          {pageCount !== null ? ` — ${pageCount} pages` : ""}
        </p>
      )}
    </div>
  );
}
