// Shell for single-file browser PDF tools (PDF to JPG, watermark, page
// numbers): upload + options + quota + progress + result. The parent owns
// the options state and supplies onConvert.
"use client";
import { useState, type ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { UploadZone } from "./upload-zone";
import { LimitCounter } from "./limit-counter";
import { ToolResult } from "./tool-result";
import { PDF_KINDS } from "@/lib/file-detect";
import { countToolUse, downloadBlob, saveToHistory } from "@/lib/client-tool";
import type { ToolSlug } from "@/lib/site";

export function SimplePdfTool({
  tool,
  resultLabel,
  optionsNode,
  convertLabel = "Convert",
  onConvert,
}: {
  tool: ToolSlug;
  resultLabel: string;
  optionsNode?: ReactNode;
  convertLabel?: string;
  onConvert: (
    file: File,
    onProgress: (text: string) => void,
  ) => Promise<{ blob: Blob; filename: string }>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);

  const reset = () => {
    if (result?.url.startsWith("blob:")) URL.revokeObjectURL(result.url);
    setResult(null);
    setFiles([]);
    setError("");
    setProgressText("");
  };

  const convert = async () => {
    const file = files[0];
    if (!file) {
      setError("Please choose a PDF first.");
      return;
    }
    setError("");
    setBusy(true);
    setProgressText("Checking your daily limit…");
    const blocked = await countToolUse(tool);
    if (blocked) {
      setError(blocked);
      setBusy(false);
      return;
    }
    try {
      const { blob, filename } = await onConvert(file, setProgressText);
      const url = URL.createObjectURL(blob);
      setResult({ url, name: filename, size: blob.size });
      setCounterKey((k) => k + 1);
      void saveToHistory(tool, filename, blob);
      // Also trigger the download immediately (the result card keeps a copy).
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <ToolResult
        tool={tool}
        resultLabel={resultLabel}
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
        onFilesChange={setFiles}
        accept=".pdf,application/pdf"
        allowedKinds={PDF_KINDS}
        maxBytes={25 * 1024 * 1024}
        maxFiles={1}
        multiple={false}
        label="Choose a PDF to convert"
        hint="One PDF, up to 25 MB. Drop, paste (Ctrl+V), or browse."
      />
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Converted in your browser — your file never leaves this device.
      </p>
      <div className="mt-3">
        <LimitCounter refreshKey={counterKey} />
      </div>
      {optionsNode && <div className="mt-5">{optionsNode}</div>}
      <div className="mt-5">
        <Button type="button" variant="accent" onClick={() => void convert()} disabled={busy || files.length === 0}>
          {busy && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
          {busy ? "Converting…" : convertLabel}
        </Button>
        {busy && progressText && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
            {progressText}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-[#dc2626] bg-red-50 p-3 font-medium text-[#991b1b] dark:bg-red-950 dark:text-red-200">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
