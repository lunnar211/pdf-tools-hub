// Edit PDF text (browser): pages render as they really look; click any
// line of text to edit it in place; the edited PDF keeps the same layout.
//
// Sizing (fixed 2026-11-08, second bug round): the render scale used to be
// computed from the OUTER tool wrapper's width, but the canvas sits two
// paddings deeper — so the bitmap came out ~17% wider than its display
// box and every overlay line sat too far right/down, overflowing the
// container. The scale is now measured from the page container itself
// (ResizeObserver), and the canvas is displayed at exactly its bitmap
// size, so 1 bitmap px = 1 CSS px and the overlay aligns exactly.
// Zoom (Fit / 100% / 150% / 200%) re-renders at the new scale, so a PDF
// whose visible content only fills part of its page (clip path, UserUnit,
// scaled XObject — common in generated certificates) can still be read
// and tapped. Line tap targets are at least 44px tall on touch.
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

type Zoom = "fit" | 1 | 1.5 | 2;
const ZOOMS: Zoom[] = ["fit", 1, 1.5, 2];
const zoomLabel = (z: Zoom) => (z === "fit" ? "Fit to screen" : `${Math.round(z * 100)}%`);
/** Smallest tap target on touch (px). Lines are far shorter than this at fit scale. */
const MIN_TAP = 44;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function EditablePage({
  doc,
  pageIndex,
  zoom,
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
  zoom: Zoom;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageWidthPt, setPageWidthPt] = useState(595);
  const [fitScale, setFitScale] = useState(0.6);
  const [measured, setMeasured] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const renderedScaleRef = useRef<number | null>(null);
  const renderTokenRef = useRef(0);

  // The page's width in points (each page can differ).
  useEffect(() => {
    let cancelled = false;
    void doc.getPage(pageIndex + 1).then((p) => {
      if (!cancelled) setPageWidthPt(p.getViewport({ scale: 1 }).width);
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageIndex]);

  // Fit scale = this page's container width / page width. Re-measured on
  // resize (e.g. phone rotation), so the page always fills its box.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) {
        setFitScale(clamp(w / pageWidthPt, 0.1, 2.5));
        setMeasured(true);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPt]);

  const scale = zoom === "fit" ? fitScale : zoom;

  // (Re-)render whenever the effective scale changes. A token drops stale
  // renders (rapid zoom taps) so a superseded render can never overwrite
  // the current one or raise its error.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (zoom === "fit" && !measured) return;
    if (renderedScaleRef.current === scale) return;
    const token = ++renderTokenRef.current;
    renderedScaleRef.current = scale;
    void renderEditablePage(doc, pageIndex, el, scale)
      .then((found) => {
        if (renderTokenRef.current !== token) return;
        setCanvasSize({ w: el.width, h: el.height });
        onLines(pageIndex, found);
      })
      .catch((err: unknown) => {
        if (renderTokenRef.current !== token) return;
        onError(err instanceof Error ? err.message : "Could not read this page.");
      });
  }, [doc, pageIndex, scale, zoom, measured, onLines, onError]);

  return (
    <section aria-label={`Page ${pageIndex + 1}`} className="rounded-xl border-2 border-[#99f6e4] bg-white p-2 dark:border-teal-900 dark:bg-slate-900">
      <p className="px-1 pb-2 text-sm font-bold text-slate-900 dark:text-white">Page {pageIndex + 1}</p>
      <div ref={containerRef} className="relative mx-auto w-full overflow-x-auto">
        <canvas
          ref={canvasRef}
          className="block"
          style={canvasSize.w > 0 ? { width: canvasSize.w, height: canvasSize.h } : undefined}
          aria-label={`Rendered page ${pageIndex + 1}`}
        />
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
                  // 16px minimum: smaller inputs make iOS Safari zoom the
                  // whole page on focus.
                  fontSize: Math.max(line.fontSize, 16),
                }}
              />
            );
          }
          // The button is the tap target (at least 44px tall, centred on
          // the line); the inner span is the tight visual outline, so the
          // box you see is the line itself, not the finger-sized target.
          const hitH = Math.max(line.height, MIN_TAP);
          const hitTop = Math.max(0, line.y - (hitH - line.height) / 2);
          return (
            <button
              key={line.id}
              type="button"
              aria-label={`Edit text: ${line.text}`}
              title={line.text}
              onClick={() => onActivate(line.id)}
              className="group absolute rounded-sm text-transparent"
              style={{ left: line.x - 4, top: hitTop, width: line.width + 8, height: hitH }}
            >
              <span
                aria-hidden="true"
                className={`absolute rounded-sm ${
                  changed
                    ? "bg-teal-500/25 outline-2 outline-dashed outline-[#0d9488]"
                    : "group-hover:outline-2 group-hover:outline-dashed group-hover:outline-[#0d9488] group-focus-visible:outline-2 group-focus-visible:outline-dashed group-focus-visible:outline-[#0d9488]"
                }`}
                style={{
                  left: 4,
                  top: (hitH - line.height) / 2,
                  width: line.width,
                  height: line.height,
                }}
              />
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
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [linesByPage, setLinesByPage] = useState<Record<number, TextLine[]>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);
  const bytesRef = useRef<Uint8Array | null>(null);
  const shownPages = Math.min(numPages, MAX_EDIT_PAGES);
  // Derived, not state: re-renders (zoom/resize) re-fire onLines for the
  // same page, so a counter would inflate.
  const pagesDone = Object.keys(linesByPage).length;

  const handleFiles = useCallback((next: File[]) => {
    setFiles(next);
    setDoc(null);
    setNumPages(0);
    setLinesByPage({});
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
        setDoc(loaded);
        setNumPages(loaded.numPages);
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
    setEdits({});
    setActiveLineId(null);
    setError("");
    bytesRef.current = null;
  };

  const onLines = useCallback((pageIndex: number, lines: TextLine[]) => {
    setLinesByPage((cur) => ({ ...cur, [pageIndex]: lines }));
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
  // Look lines up by id, not by array index: filterBackgroundLines drops
  // repeated watermark lines, so a line's id ("page:groupIndex") is no
  // longer its position in the filtered array — an index lookup would
  // silently lose the edit (empty "Your edits" list, empty download).
  const allLines = Object.values(linesByPage).flat();
  const editedList = Object.entries(edits)
    .map(([id, value]) => {
      const line = allLines.find((l) => l.id === id);
      return line ? { id, page: line.pageIndex, oldText: line.text, newText: value, line } : null;
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
    <div className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
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
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Zoom">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Zoom:</span>
            {ZOOMS.map((z) => (
              <button
                key={String(z)}
                type="button"
                aria-pressed={zoom === z}
                onClick={() => {
                  setZoom(z);
                  setActiveLineId(null);
                }}
                className={`min-h-[36px] rounded-lg border px-3 py-1 text-sm font-bold ${
                  zoom === z
                    ? "border-[#0d9488] bg-[#0d9488] text-white"
                    : "border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {zoomLabel(z)}
              </button>
            ))}
            <span className="text-sm text-slate-600 dark:text-slate-300">
              Zoom in if the text looks small.
            </span>
          </div>
          {Array.from({ length: shownPages }, (_, i) => (
            <EditablePage
              key={`${files[0].name}-${files[0].size}-${i}`}
              doc={doc}
              pageIndex={i}
              zoom={zoom}
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
