"use client";
import { useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { UploadCloud, FileCheck, AlertTriangle, Download, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { CrossPromo } from "./cross-promo";

export type Phase = "idle" | "uploading" | "processing" | "done" | "error";

export function ToolShell({
  endpoint, accept, multiple, fieldName = "files", extraFields, resultLabel, children,
}: {
  endpoint: string;
  accept: string;
  multiple: boolean;
  fieldName?: string;
  extraFields?: ReactNode;
  resultLabel: string;
  children?: React.ReactNode;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number; inputSize: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list);
    setFiles(multiple ? arr : arr.slice(0, 1));
    setError(""); setResult(null); setPhase("idle");
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (files.length === 0) { setError("Please choose a file first."); return; }
    const form = formRef.current!;
    const data = new FormData(form);
    // Rebuild file entries in order (form may already contain them; reset first).
    data.delete(fieldName);
    files.forEach((f) => data.append(fieldName, f));
    setPhase("uploading"); setProgress(0); setError(""); setResult(null);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "blob";
    xhr.upload.onprogress = (ev) => { if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100)); };
    xhr.upload.onload = () => setPhase("processing");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        const disp = xhr.getResponseHeader("Content-Disposition") || "";
        const match = /filename="([^"]+)"/.exec(disp);
        const inBytes = Number(xhr.getResponseHeader("X-Input-Bytes") || 0);
        const url = URL.createObjectURL(blob);
        setResult({ url, name: match?.[1] || resultLabel, size: blob.size, inputSize: inBytes || files.reduce((s, f) => s + f.size, 0) });
        setPhase("done"); setProgress(100);
      } else {
        (xhr.response as Blob).text().then((t) => {
          let msg = "Conversion failed. Please check the file and try again.";
          try { const j = JSON.parse(t); if (j.error) msg = j.error; } catch { /* keep generic */ }
          setError(msg); setPhase("error");
        });
      }
    };
    xhr.onerror = () => { setError("Network error. Please check your connection and try again."); setPhase("error"); };
    xhr.send(data);
  };

  const fmt = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`);

  return (
    <div>
      <form ref={formRef} onSubmit={submit} className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button" tabIndex={0} aria-label="Choose files to upload"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-150 ${dragOver ? "border-[#ea580c] bg-[#f0fdfa] dark:bg-teal-950" : "border-[#99f6e4] dark:border-teal-800"}`}
        >
          <UploadCloud className="mx-auto text-[#0d9488]" size={40} aria-hidden="true" />
          <p className="mt-3 font-bold text-slate-900 dark:text-white">Drag and drop your files here, or click to browse</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Files are processed on our server and deleted immediately after processing (max 60 minutes in any case); we never list or share them.</p>
          <input ref={inputRef} type="file" name={fieldName} accept={accept} multiple={multiple} className="sr-only"
            onChange={(e) => e.target.files && addFiles(e.target.files)} aria-label="File upload" />
        </div>
        {files.length > 0 && (
          <ul className="mt-4 space-y-1" aria-label="Selected files">
            {files.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <FileCheck size={18} className="text-[#0d9488]" aria-hidden="true" /> {f.name} <span className="text-sm text-slate-500">({fmt(f.size)})</span>
              </li>
            ))}
          </ul>
        )}
        {extraFields}
        {children}
        <div className="mt-5">
          <Button type="submit" variant="accent" disabled={phase === "uploading" || phase === "processing"} className="w-full sm:w-auto">
            {(phase === "uploading" || phase === "processing") && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
            {phase === "uploading" ? `Uploading ${progress}%` : phase === "processing" ? "Processing" : "Convert"}
          </Button>
        </div>
        {(phase === "uploading" || phase === "processing") && (
          <div className="mt-4" role="status" aria-live="polite">
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#f0fdfa] dark:bg-slate-800">
              <div className="h-full bg-[#0d9488] transition-all duration-150" style={{ width: phase === "processing" ? "100%" : `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{phase === "uploading" ? `Uploading: ${progress}%` : "Upload complete. Converting your file now."}</p>
          </div>
        )}
        {phase === "error" && error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-[#dc2626] bg-red-50 p-3 font-medium text-[#991b1b] dark:bg-red-950 dark:text-red-200">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> {error}
          </p>
        )}
      </form>
      {phase === "done" && result && (
        <div className="mt-5 rounded-2xl border-2 border-[#0d9488] bg-[#f0fdfa] p-5 dark:border-teal-700 dark:bg-teal-950" role="status">
          <p className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"><FileCheck className="text-[#0d9488]" aria-hidden="true" /> Conversion complete</p>
          <p className="mt-2 text-slate-700 dark:text-slate-200">
            {resultLabel}: {result.name} ({fmt(result.size)})
            {endpoint.includes("compress") && result.inputSize > 0 && (
              <> — down from {fmt(result.inputSize)} ({Math.max(0, Math.round((1 - result.size / result.inputSize) * 100))}% smaller)</>
            )}
          </p>
          <a href={result.url} download={result.name} className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]">
            <Download size={18} aria-hidden="true" /> Download result
          </a>
          <CrossPromo />
        </div>
      )}
    </div>
  );
}
