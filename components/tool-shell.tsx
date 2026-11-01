// Shell for SERVER-side tools (PDF↔Word, Merge, Split, Compress): upload
// via XHR with progress, then a result screen. Uses the shared UploadZone
// (drag/drop/paste/remove/magic-byte validation) plus the real limit
// counter and contextual next-tool suggestions. Server files are processed
// in memory only — nothing is ever written to disk.
"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { FileCheck, AlertTriangle, Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { CrossPromo } from "./cross-promo";
import { UploadZone } from "./upload-zone";
import { LimitCounter } from "./limit-counter";
import { NextToolSuggest } from "./next-tool-suggest";
import { PDF_KINDS, formatBytes, type ClientFileKind } from "@/lib/file-detect";
import { saveHistoryEntry } from "@/lib/history";
import type { ToolSlug } from "@/lib/site";

export type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export function ToolShell({
  endpoint, accept, multiple, fieldName = "files", extraFields, resultLabel, children,
  toolSlug, allowedKinds = PDF_KINDS, maxBytes = 25 * 1024 * 1024, maxFiles,
}: {
  endpoint: string;
  accept: string;
  multiple: boolean;
  fieldName?: string;
  extraFields?: ReactNode;
  resultLabel: string;
  children?: React.ReactNode;
  toolSlug?: ToolSlug;
  allowedKinds?: ClientFileKind[];
  maxBytes?: number;
  maxFiles?: number;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number; inputSize: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  // Revoke the previous result URL whenever it is replaced (fixes the old
  // leak where result object URLs were never revoked).
  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  const handleFilesChange = (next: File[]) => {
    setFiles(next);
    setError("");
    setResult(null);
    setPhase("idle");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please choose a file first.");
      return;
    }
    const form = formRef.current!;
    const data = new FormData(form);
    // Rebuild file entries in order (the zone's input is not part of the form).
    data.delete(fieldName);
    files.forEach((f) => data.append(fieldName, f));
    setPhase("uploading");
    setProgress(0);
    setError("");
    setResult(null);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "blob";
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.upload.onload = () => setPhase("processing");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        const disp = xhr.getResponseHeader("Content-Disposition") || "";
        const match = /filename="([^"]+)"/.exec(disp);
        const name = match?.[1] || resultLabel;
        const inBytes = Number(xhr.getResponseHeader("X-Input-Bytes") || 0);
        const url = URL.createObjectURL(blob);
        setResult({
          url,
          name,
          size: blob.size,
          inputSize: inBytes || files.reduce((s, f) => s + f.size, 0),
        });
        setPhase("done");
        setProgress(100);
        setCounterKey((k) => k + 1);
        // Save the output for 1-hour re-download (on-device only).
        if (toolSlug) void saveHistoryEntry(toolSlug, name, blob);
      } else {
        (xhr.response as Blob).text().then((t) => {
          let msg = "Conversion failed. Please check the file and try again.";
          try {
            const j = JSON.parse(t);
            if (j.error) msg = j.error;
          } catch {
            /* keep generic */
          }
          setError(msg);
          setPhase("error");
        });
      }
    };
    xhr.onerror = () => {
      setError("Network error. Please check your connection and try again.");
      setPhase("error");
    };
    xhr.send(data);
  };

  return (
    <div>
      <form
        ref={formRef}
        onSubmit={submit}
        className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900"
      >
        <UploadZone
          files={files}
          onFilesChange={handleFilesChange}
          accept={accept}
          allowedKinds={allowedKinds}
          maxBytes={maxBytes}
          maxFiles={maxFiles ?? (multiple ? 20 : 1)}
          multiple={multiple}
          label="Choose files to upload"
          hint={`Up to ${maxFiles ?? (multiple ? 20 : 1)} files, ${formatBytes(maxBytes)} each. You can also paste files with Ctrl+V.`}
        />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Files are processed in memory on our server and never stored — nothing is written to disk.
          We never list or share them.
        </p>
        <div className="mt-3">
          <LimitCounter refreshKey={counterKey} />
        </div>
        {extraFields}
        {children}
        <div className="mt-5">
          <Button
            type="submit"
            variant="accent"
            disabled={phase === "uploading" || phase === "processing"}
            className="w-full sm:w-auto"
          >
            {(phase === "uploading" || phase === "processing") && (
              <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            )}
            {phase === "uploading"
              ? `Uploading ${progress}%`
              : phase === "processing"
                ? "Processing"
                : "Convert"}
          </Button>
        </div>
        {(phase === "uploading" || phase === "processing") && (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#f0fdfa] dark:bg-slate-800">
              <div
                className="h-full bg-[#0d9488] transition-all duration-150"
                style={{ width: phase === "processing" ? "100%" : `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {phase === "uploading" ? `Uploading: ${progress}%` : "Upload complete. Converting your file now."}
            </p>
          </div>
        )}
        {phase === "error" && error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-[#dc2626] bg-red-50 p-3 font-medium text-[#991b1b] dark:bg-red-950 dark:text-red-200"
          >
            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> {error}
          </p>
        )}
      </form>
      {phase === "done" && result && (
        <div
          className="mt-5 rounded-2xl border-2 border-[#0d9488] bg-[#f0fdfa] p-5 dark:border-teal-700 dark:bg-teal-950"
          role="status"
        >
          <p className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <FileCheck className="text-[#0d9488]" aria-hidden="true" /> Conversion complete
          </p>
          <p className="mt-2 text-slate-700 dark:text-slate-200">
            {resultLabel}: {result.name} ({formatBytes(result.size)})
            {endpoint.includes("compress") && result.inputSize > 0 && (
              <>
                {" "}
                — down from {formatBytes(result.inputSize)} (
                {Math.max(0, Math.round((1 - result.size / result.inputSize) * 100))}% smaller)
              </>
            )}
          </p>
          <a
            href={result.url}
            download={result.name}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]"
          >
            <Download size={18} aria-hidden="true" /> Download result
          </a>
          {toolSlug && <NextToolSuggest tool={toolSlug} />}
          <CrossPromo />
        </div>
      )}
    </div>
  );
}
