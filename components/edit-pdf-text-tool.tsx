// Edit PDF text (browser): pages render as they really look; click any
// line of text to edit it in place; the edited PDF keeps the same layout.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, Undo2 } from "lucide-react";
import { Button } from "./ui/button";
import { UploadZone } from "./upload-zone";
import { LimitCounter } from "./limit-counter";
import { ToolResult } from "./tool-result";
import { PDF_KINDS } from "@/lib/file-detect";
import { fileToBytes, loadPdfjs } from "@/lib/pdf-client";
import {
  applyTextEdits,
  renderEditablePage,
  MAX_EDIT_PAGES,
  type TextLine,
  type TextEdit,
} from "@/lib/edit-pdf-text";
import { countToolUse, downloadBlob, saveToHistory } from "@/lib/client-tool";
import type { PDFDocumentProxy } from "pdfjs-dist";

function EditablePage({
  doc,
  pageIndex,
  scale,
  lines,
  edits,
  activeLineId,
  onLines,
  onError,
  onActivate,
  onCommit,
  onCancel,
}: {
  doc: PDFDocumentProxy;
  pageIndex: number;
  scale: number;
  lines: TextLine[];
  edits: Record<string, string>;
  activeLineId: string | null;
  onLines: (pageIndex: number, lines: TextLine[]) => void;
  onError: (msg: string) => void;
  onActivate: (id: string) => void;
  onCommit: (line: TextLine, value: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderedRef = useRef(false);

  const render = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el;
      if (!el || renderedRef.current) return;
      renderedRef.current = true;
      void renderEditablePage(doc, pageIndex, el, scale)
        .then((found) => onLines(pageIndex, found))
        .catch((err: unknown) => {
          onError(err instanceof Error ? err.message : "Could not read this page.");
        });
    },
    [doc, pageIndex, scale, onLines, onError],
  );

  return (
    <section aria-label={`Page ${pageIndex + 1}`} className="rounded-xl border-2 border-[#99f6e4] bg-white p-2 dark:border-teal-900 dark:bg-slate-900">
      <p className="px-1 pb-2 text-sm font-bold text-slate-900 dark:text-white">Page {pageIndex + 1}</p>
      <div className="relative mx-auto w-full overflow-hidden">
        <canvas ref={render} className="block h-auto w-full" aria-label={`Rendered page ${pageIndex + 1}`} />
        {lines.map((line) => {
          const current = edits[line.id] ?? line.text;
          const changed = line.id in edits && edits[line.id] !== line.text;
          if (activeLineId === line.id) {
            return (
              <input
                key={line.id}
                defaultValue={current}
                autoFocus
                aria-label={`Edit text: ${line.text}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCommit(line, (e.target as HTMLInputElement).value);
                  if (e.key === "Escape") onCancel();
                }}
                onBlur={(e) => onCommit(line, e.target.value)}
                className="absolute z-10 rounded border-2 border-[#0d9488] bg-white px-1 text-slate-900 shadow-lg outline-none"
                style={{
                  left: line.x,
                  top: line.y - 2,
                  width: Math.max(line.width + 16, 140),
                  height: Math.max(line.height + 6, 28),
                  fontSize: Math.max(line.fontSize, 12),
                }}
              />
            );
          }
          return (
            <button
              key={line.id}
              type="button"
              aria-label={`Edit text: ${line.text}`}
              title={line.text}
              onClick={() => onActivate(line.id)}
              className={`absolute rounded-sm text-transparent hover:outline-2 hover:outline-dashed hover:outline-[#0d9488] focus:outline-2 focus:outline-dashed focus:outline-[#0d9488] ${
                changed ? "bg-teal-500/25 outline-2 outline-dashed outline-[#0d9488]" : ""
              }`}
              style={{ left: line.x, top: line.y, width: line.width, height: line.height, fontSize: line.fontSize }}
            >
              {line.text}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function EditPdfTextTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [linesByPage, setLinesByPage] = useState<Record<number, TextLine[]>>({});
  const [pagesDone, setPagesDone] = useState(0);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);
  const bytesRef = useRef<Uint8Array | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const shownPages = Math.min(numPages, MAX_EDIT_PAGES);

  const handleFiles = useCallback((next: File[]) => {
    setFiles(next);
    setDoc(null);
    setNumPages(0);
    setLinesByPage({});
    setPagesDone(0);
    setEdits({});
    setActiveLineId(null);
    setError("");
    setResult(null);
    bytesRef.current = null;
    const file = next[0];
    if (!file) return;
    void (async () => {
      try {
        const bytes = await fileToBytes(file);
        bytesRef.current = bytes;
        const pdfjs = await loadPdfjs();
        const loaded = await pdfjs.getDocument({ data: bytes.slice() }).promise;
        const first = await loaded.getPage(1);
        const base = first.getViewport({ scale: 1 });
        const wrapWidth = wrapperRef.current?.clientWidth || 760;
        const s = Math.min(1.6, Math.max(0.5, wrapWidth / base.width));
        setDoc(loaded);
        setNumPages(loaded.numPages);
        setScale(s);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read this PDF.");
      }
    })();
  }, []);

  const reset = () => {
    if (result?.url.startsWith("blob:")) URL.revokeObjectURL(result.url);
    setResult(null);
    setFiles([]);
    setDoc(null);
    setNumPages(0);
    setLinesByPage({});
    setPagesDone(0);
    setEdits({});
    setActiveLineId(null);
    setError("");
    bytesRef.current = null;
  };

  const onLines = useCallback((pageIndex: number, lines: TextLine[]) => {
    setLinesByPage((cur) => ({ ...cur, [pageIndex]: lines }));
    setPagesDone((n) => n + 1);
  }, []);

  const onError = useCallback((msg: string) => setError(msg), []);

  const commitEdit = useCallback((line: TextLine, value: string) => {
    const next = value.trim();
    setEdits((cur) => {
      const copy = { ...cur };
      if (next === line.text) delete copy[line.id];
      else copy[line.id] = next;
      return copy;
    });
    setActiveLineId(null);
  }, []);

  const totalLines = Object.values(linesByPage).reduce((n, ls) => n + ls.length, 0);
  const editCount = Object.keys(edits).length;
  const editedList = Object.entries(edits)
    .map(([id, value]) => {
      const [p, l] = id.split(":").map(Number);
      const line = linesByPage[p]?.[l];
      return line ? { id, page: p, oldText: line.text, newText: value, line } : null;
    })
    .filter((e): e is { id: string; page: number; oldText: string; newText: string; line: TextLine } => Boolean(e));

  const download = async () => {
    const file = files[0];
    const bytes = bytesRef.current;
    if (!file || !bytes || editCount === 0) return;
    setError("");
    setBusy(true);
    setProgressText("Checking your daily limit…");
    const blocked = await countToolUse("edit-pdf-text");
    if (blocked) {
      setError(blocked);
      setBusy(false);
      return;
    }
    try {
      setProgressText("Rebuilding your PDF…");
      const list: TextEdit[] = editedList.map((e) => ({
        pageIndex: e.page,
        originalText: e.oldText,
        newText: e.newText,
        pdfX: e.line.pdfX,
        pdfBaselineY: e.line.pdfBaselineY,
        pdfWidth: e.line.pdfWidth,
        pdfTop: e.line.pdfTop,
        pdfBottom: e.line.pdfBottom,
        pdfFontSize: e.line.pdfFontSize,
        bold: e.line.bold,
        italic: e.line.italic,
      }));
      const out = await applyTextEdits(bytes, list);
      const blob = new Blob([out as unknown as BlobPart], { type: "application/pdf" });
      const name = file.name.replace(/\.pdf$/i, "") + "-edited.pdf";
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
      setCounterKey((k) => k + 1);
      void saveToHistory("edit-pdf-text", name, blob);
      downloadBlob(blob, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (result?.url.startsWith("blob:")) URL.revokeObjectURL(result.url);
    };
    // Only revoke on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result) {
    return (
      <ToolResult
        tool="edit-pdf-text"
        resultLabel="Your edited PDF"
        name={result.name}
        size={result.size}
        url={result.url}
        note="Edited in your browser — your file never left this device. Edited text was redrawn in a standard font at the same size and position, so the layout is the same but the letter shapes may differ slightly from the original font. The result is also saved for 1-hour re-download on your Account page."
        onReset={reset}
      />
    );
  }

  return (
    <div ref={wrapperRef} className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
      <UploadZone
        files={files}
        onFilesChange={handleFiles}
        accept=".pdf,application/pdf"
        allowedKinds={PDF_KINDS}
        maxBytes={25 * 1024 * 1024}
        maxFiles={1}
        multiple={false}
        label="Choose a PDF to edit"
        hint="One PDF, up to 25 MB. Drop, paste (Ctrl+V), or browse."
      />
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Edited in your browser — your file never leaves this device. Click any line of text to edit it
        in place. Edited text is redrawn in a standard font at the same size and position, so the
        layout stays the same but the letter shapes may look slightly different.
      </p>
      <div className="mt-3">
        <LimitCounter refreshKey={counterKey} />
      </div>
      {files[0] && !doc && !error && (
        <p className="py-6 text-center text-sm text-slate-500" role="status">Reading your PDF…</p>
      )}
      {doc && numPages > MAX_EDIT_PAGES && (
        <p className="mt-4 rounded-lg border border-[#ea580c] bg-orange-50 p-3 text-sm font-medium text-slate-700 dark:bg-orange-950 dark:text-slate-200">
          This PDF has {numPages} pages — only the first {MAX_EDIT_PAGES} can be edited here. The
          remaining pages stay exactly as they are.
        </p>
      )}
      {doc && (
        <div className="mt-5 space-y-5">
          {Array.from({ length: shownPages }, (_, i) => (
            <EditablePage
              key={`${files[0].name}-${files[0].size}-${i}`}
              doc={doc}
              pageIndex={i}
              scale={scale}
              lines={linesByPage[i] ?? []}
              edits={edits}
              activeLineId={activeLineId}
              onLines={onLines}
              onError={onError}
              onActivate={setActiveLineId}
              onCommit={commitEdit}
              onCancel={() => setActiveLineId(null)}
            />
          ))}
          {pagesDone >= shownPages && totalLines === 0 && (
            <p role="alert" className="rounded-lg border border-[#ea580c] bg-orange-50 p-3 text-sm font-medium text-slate-700 dark:bg-orange-950 dark:text-slate-200">
              This PDF has no selectable text — it looks like a scan or a picture. Make it searchable
              first with <a href="/ocr-pdf" className="font-bold text-[#0f766e] underline">OCR: scanned PDF to searchable text</a>,
              then edit the result here.
            </p>
          )}
          {pagesDone >= shownPages && totalLines > 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-300" role="status">
              {totalLines} text lines on {shownPages} page{shownPages === 1 ? "" : "s"} — click any line to
              edit it. {editCount > 0 ? `${editCount} line${editCount === 1 ? "" : "s"} edited.` : "Nothing edited yet."}
            </p>
          )}
        </div>
      )}
      {editCount > 0 && (
        <div className="mt-5">
          <h3 className="font-bold text-slate-900 dark:text-white">Your edits</h3>
          <ul className="mt-2 space-y-2">
            {editedList.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-[#99f6e4] bg-white px-3 py-2 text-sm dark:border-teal-900 dark:bg-slate-900">
                <span className="text-slate-600 dark:text-slate-300">Page {e.page + 1}:</span>
                <span className="line-through text-slate-500">{e.oldText}</span>
                <span aria-hidden="true">→</span>
                <span className="font-bold text-slate-900 dark:text-white">{e.newText || "(deleted)"}</span>
                <button
                  type="button"
                  onClick={() =>
                    setEdits((cur) => {
                      const copy = { ...cur };
                      delete copy[e.id];
                      return copy;
                    })
                  }
                  className="ml-auto inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2 py-1 font-bold text-slate-700 dark:text-slate-200"
                >
                  <Undo2 size={14} aria-hidden="true" /> Undo
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" variant="accent" onClick={() => void download()} disabled={busy}>
              {busy && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
              {busy ? "Converting…" : "Download edited PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEdits({});
                setActiveLineId(null);
              }}
              disabled={busy}
            >
              Undo all edits
            </Button>
          </div>
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
