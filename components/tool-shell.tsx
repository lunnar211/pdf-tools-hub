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
  reorderable = false, pageStrip = false,
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
  /** Merge: drag / move files into the order they are joined. */
  reorderable?: boolean;
  /** Split: show a page-count + thumbnail strip for the uploaded PDF. */
  pageStrip?: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number; inputSize: number; imagesDownsampled?: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);
  const [dragId, setDragId] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  // Split page strip: read the page count + first 12 page thumbnails in
  // the browser (pdf.js, on demand) so the user sees the pages before
  // typing ranges. Nothing is uploaded.
  useEffect(() => {
    if (!pageStrip || files.length !== 1) return;
    let cancelled = false;
    (async () => {
      try {
        const { loadPdfjs, fileToBytes } = await import("@/lib/pdf-client");
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument({ data: (await fileToBytes(files[0])).slice() }).promise;
        if (cancelled) return;
        setPageCount(doc.numPages);
        const shown = Math.min(doc.numPages, 12);
        const out: string[] = [];
        for (let p = 1; p <= shown; p++) {
          const page = await doc.getPage(p);
          const base = page.getViewport({ scale: 1 });
          const scale = 120 / Math.max(base.width, base.height);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) break;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
          if (cancelled) return;
        }
        setThumbs(out);
      } catch {
        if (!cancelled) { setPageCount(null); setThumbs([]); }
      }
    })();
    return () => { cancelled = true; };
  }, [pageStrip, files]);

  const moveFile = (from: number, to: number) => {
    if (to < 0 || to >= files.length) return;
    const next = [...files];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFiles(next);
    setResult(null);
    setPhase("idle");
  };

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
    setPageCount(null);
    setThumbs([]);
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
        const downsampled = Number(xhr.getResponseHeader("X-Images-Downsampled") || 0);
        const url = URL.createObjectURL(blob);
        setResult({
          url,
          name,
          size: blob.size,
          inputSize: inBytes || files.reduce((s, f) => s + f.size, 0),
          imagesDownsampled: downsampled,
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
        {reorderable && files.length > 1 && (
          <div className="mt-4" aria-label="File order — drag to reorder">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Join order — drag, or use the arrows
            </p>
            <ol className="mt-2 space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  draggable
                  onDragStart={() => setDragId(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragId === null || dragId === i) return;
                    moveFile(dragId, i);
                    setDragId(null);
                  }}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg border border-[#99f6e4] bg-[#fbf9f2] px-3 py-2 dark:border-teal-800 dark:bg-slate-800"
                >
                  <span className="cursor-grab font-mono text-sm font-bold text-[#0f766e] dark:text-[#5eead4]" aria-hidden="true">☰</span>
                  <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-800 dark:text-slate-100">{f.name}</span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{formatBytes(f.size)}</span>
                  <button type="button" onClick={() => moveFile(i, i - 1)} disabled={i === 0} aria-label={`Move ${f.name} up`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#99f6e4] text-lg font-bold text-slate-700 disabled:opacity-40 dark:border-teal-800 dark:text-slate-200">↑</button>
                  <button type="button" onClick={() => moveFile(i, i + 1)} disabled={i === files.length - 1} aria-label={`Move ${f.name} down`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-[#99f6e4] text-lg font-bold text-slate-700 disabled:opacity-40 dark:border-teal-800 dark:text-slate-200">↓</button>
                </li>
              ))}
            </ol>
          </div>
        )}
        {pageStrip && files.length === 1 && pageCount !== null && (
          <div className="mt-4" aria-label="Pages in this PDF">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {files[0].name} · {pageCount} {pageCount === 1 ? "page" : "pages"}
            </p>
            {thumbs.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1" role="list" aria-label="First pages">
                {thumbs.map((t, i) => (
                  <span key={i} role="listitem" className="shrink-0 rounded-sm border border-[#99f6e4] bg-white p-1 dark:border-teal-800 dark:bg-slate-800">
                    <img src={t} alt={`Page ${i + 1}`} className="h-20 w-auto" />
                    <span className="mt-0.5 block text-center font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">{i + 1}</span>
                  </span>
                ))}
                {pageCount > thumbs.length && (
                  <span className="flex h-20 shrink-0 items-center px-2 font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    +{pageCount - thumbs.length} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}
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
                {result.imagesDownsampled !== undefined && result.imagesDownsampled > 0 && (
                  <>
                    {" · "}
                    {result.imagesDownsampled} {result.imagesDownsampled === 1 ? "image" : "images"} downsampled
                  </>
                )}
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
