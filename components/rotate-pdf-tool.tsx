// Rotate PDF (browser): pick a rotation per page from thumbnails, then save.
"use client";
import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { UploadZone } from "./upload-zone";
import { LimitCounter } from "./limit-counter";
import { ToolResult } from "./tool-result";
import { PdfPageGrid, type PageGridState } from "./pdf-page-grid";
import { PDF_KINDS } from "@/lib/file-detect";
import { fileToBytes, rotatePdf } from "@/lib/pdf-client";
import { countToolUse, downloadBlob, saveToHistory } from "@/lib/client-tool";

export function RotatePdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [grid, setGrid] = useState<PageGridState | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);

  const handleFiles = (next: File[]) => {
    setFiles(next);
    setGrid(null);
    setError("");
  };

  const reset = () => {
    if (result?.url.startsWith("blob:")) URL.revokeObjectURL(result.url);
    setResult(null);
    setFiles([]);
    setGrid(null);
    setError("");
  };

  const convert = async () => {
    const file = files[0];
    if (!file || !grid) return;
    setError("");
    setBusy(true);
    setProgressText("Checking your daily limit…");
    const blocked = await countToolUse("rotate-pdf");
    if (blocked) {
      setError(blocked);
      setBusy(false);
      return;
    }
    try {
      setProgressText("Rotating pages…");
      const bytes = await fileToBytes(file);
      const out = await rotatePdf(bytes, grid.rotations);
      const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-rotated.pdf";
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
      setCounterKey((k) => k + 1);
      void saveToHistory("rotate-pdf", name, blob);
      downloadBlob(blob, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <ToolResult
        tool="rotate-pdf"
        resultLabel="Your rotated PDF"
        name={result.name}
        size={result.size}
        url={result.url}
        note="Converted in your browser — your file never left this device. The result is also saved for 1-hour re-download on your Account page."
        onReset={reset}
      />
    );
  }

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
        label="Choose a PDF to rotate"
        hint="One PDF, up to 25 MB. Drop, paste (Ctrl+V), or browse."
      />
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Converted in your browser — your file never leaves this device.
      </p>
      <div className="mt-3">
        <LimitCounter refreshKey={counterKey} />
      </div>
      {files[0] && (
        <div className="mt-5">
          <PdfPageGrid key={`${files[0].name}-${files[0].size}-${files[0].lastModified}`} file={files[0]} allowRotate allowDelete={false} allowReorder={false} onChange={setGrid} />
        </div>
      )}
      {files[0] && grid && (
        <div className="mt-5">
          <Button type="button" variant="accent" onClick={() => void convert()} disabled={busy}>
            {busy && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
            {busy ? "Converting…" : "Save rotated PDF"}
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
    </div>
  );
}
