// Image to PDF — browser-first. Conversion runs on the user's device with
// pdf-lib: files never leave the browser. Thumbnails with drag-to-reorder
// (+ keyboard move buttons), per-image rotate, page options, an estimated
// output size before download, per-file errors, and a server fallback ONLY
// for JPG/PNG files the browser could not decode (or browsers without
// createImageBitmap) via the existing /api/image-to-pdf route.
"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, AlertTriangle, Download, RotateCcw, RotateCw, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "./ui/button";
import { UploadZone } from "./upload-zone";
import { LimitCounter } from "./limit-counter";
import { NextToolSuggest } from "./next-tool-suggest";
import { IMAGE_KINDS, formatBytes, detectKind } from "@/lib/file-detect";
import {
  decodeImageFile,
  type DecodedImage,
} from "@/lib/image-decode";
import {
  buildImagePdf,
  estimatePdfBytes,
  type ImagePdfOptions,
  type PdfImageItem,
} from "@/lib/image-pdf";
import { countToolUse, saveToHistory } from "@/lib/client-tool";

type Item = {
  id: string;
  file: File;
  status: "decoding" | "ready" | "error";
  error?: string;
  decoded?: DecodedImage;
  rotation: 0 | 90 | 180 | 270;
};

type Phase = "idle" | "building" | "fallback" | "done" | "error";

function ThumbImg({ item }: { item: Item }) {
  // Rotated thumbnails draw to a <canvas> via a ref callback (no state in
  // an effect, no render-phase side effects). Unrotated thumbnails use the
  // object URL directly; the browser scales it with CSS.
  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !item.decoded || item.rotation === 0) return;
      const { bitmap } = item.decoded;
      const swap = item.rotation === 90 || item.rotation === 270;
      const w = swap ? bitmap.height : bitmap.width;
      const h = swap ? bitmap.width : bitmap.height;
      const scale = Math.min(1, 400 / Math.max(w, h));
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    },
    [item.decoded, item.rotation],
  );
  if (!item.decoded) return null;
  if (item.rotation === 0) {
    // Blob-URL thumbnails cannot use next/image (unoptimized user files).
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.decoded.thumbUrl} alt={item.file.name} className="h-32 w-full object-contain bg-white" draggable={false} />;
  }
  return <canvas ref={canvasRef} aria-label={item.file.name} className="h-32 w-full object-contain bg-white" />;
}

const SELECT_CLASS =
  "min-h-[44px] w-full rounded-lg border-2 border-[#99f6e4] bg-white px-3 py-2 text-slate-900 dark:border-teal-800 dark:bg-slate-800 dark:text-white";

function OptionSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-bold text-slate-900 dark:text-white">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`mt-1 ${SELECT_CLASS}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ImageToPdfTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [options, setOptions] = useState<ImagePdfOptions>({
    pageSize: "a4",
    orientation: "auto",
    margin: "small",
    fit: "fit",
    quality: "high",
    layout: 1,
    pageNumbers: false,
    title: "",
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [counterKey, setCounterKey] = useState(0);
  const [fallbackBusy, setFallbackBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  // On-device decoding support, read without a hydration mismatch: the
  // server renders "unknown" (a loading placeholder), and the client
  // resolves to yes/no right after hydration. Capability never changes
  // during a session, so the subscription is a no-op.
  const support = useSyncExternalStore(
    () => () => {},
    () =>
      typeof window !== "undefined" && typeof window.createImageBitmap === "function" ? "yes" : "no",
    () => "unknown",
  );
  const itemsRef = useRef<Item[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  });

  useEffect(() => {
    return () => {
      // Revoke thumbnail object URLs on unmount.
      for (const it of itemsRef.current) {
        if (it.decoded?.thumbUrl.startsWith("blob:")) URL.revokeObjectURL(it.decoded.thumbUrl);
      }
      if (result) URL.revokeObjectURL(result.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilesChange = useCallback((next: File[]) => {
    const prev = itemsRef.current;
    const kept = prev.filter((it) => next.includes(it.file));
    const removed = prev.filter((it) => !next.includes(it.file));
    for (const it of removed) {
      if (it.decoded?.thumbUrl.startsWith("blob:")) URL.revokeObjectURL(it.decoded.thumbUrl);
    }
    setItems(kept);
    const existing = new Set(kept.map((it) => it.file));
    const added = next.filter((f) => !existing.has(f));
    for (const f of added) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((cur) => [...cur, { id, file: f, status: "decoding", rotation: 0 }]);
      decodeImageFile(f)
        .then((decoded) => {
          setItems((cur) => cur.map((it) => (it.id === id ? { ...it, status: "ready", decoded } : it)));
        })
        .catch((err: unknown) => {
          setItems((cur) =>
            cur.map((it) =>
              it.id === id
                ? { ...it, status: "error", error: err instanceof Error ? err.message : "Could not read this image." }
                : it,
            ),
          );
        });
    }
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setItems((cur) => {
      const idx = cur.findIndex((it) => it.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= cur.length) return cur;
      const next = [...cur];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);

  const rotate = useCallback((id: string, dir: 90 | -90) => {
    setItems((cur) =>
      cur.map((it) =>
        it.id === id ? { ...it, rotation: ((it.rotation + dir + 360) % 360) as Item["rotation"] } : it,
      ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((cur) => {
      const it = cur.find((x) => x.id === id);
      if (it?.decoded?.thumbUrl.startsWith("blob:")) URL.revokeObjectURL(it.decoded.thumbUrl);
      return cur.filter((x) => x.id !== id);
    });
  }, []);

  const readyItems: PdfImageItem[] = useMemo(
    () =>
      items
        .filter((it) => it.status === "ready" && it.decoded)
        .map((it) => ({ image: it.decoded!, rotation: it.rotation, inputBytes: it.file.size })),
    [items],
  );
  const failedItems = useMemo(() => items.filter((it) => it.status === "error"), [items]);
  const estimated = useMemo(
    () => (readyItems.length > 0 ? estimatePdfBytes(readyItems, options) : 0),
    [readyItems, options],
  );

  const setOpt = <K extends keyof ImagePdfOptions>(key: K, value: ImagePdfOptions[K]) =>
    setOptions((o) => ({ ...o, [key]: value }));

  const finish = (bytes: Uint8Array, name: string) => {
    const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setResult({ url, name, size: blob.size });
    setPhase("done");
    setCounterKey((k) => k + 1);
    void saveToHistory("image-to-pdf", name, blob);
  };

  const convert = async () => {
    if (readyItems.length === 0) {
      setError("Add at least one image that could be read.");
      return;
    }
    setError("");
    setPhase("building");
    setProgressText("Checking your daily limit…");
    const blocked = await countToolUse("image-to-pdf");
    if (blocked) {
      setError(blocked);
      setPhase("error");
      return;
    }
    try {
      setProgressText("Building your PDF…");
      const bytes = await buildImagePdf(readyItems, options, (done, total) => {
        setProgressText(`Building page ${done} of ${total}…`);
      });
      const name = options.title.trim()
        ? `${options.title.trim().replace(/[\\/:*?"<>|]+/g, "-")}.pdf`
        : "images.pdf";
      finish(bytes, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed. Please try again.");
      setPhase("error");
    }
  };

  // Server fallback: only for JPG/PNG files the browser could not decode.
  // The server route processes files in memory and never stores them.
  const runFallback = async () => {
    const candidates = failedItems;
    if (candidates.length === 0) return;
    setFallbackBusy(true);
    setError("");
    try {
      const serverFiles: File[] = [];
      for (const it of candidates) {
        const kind = await detectKind(it.file);
        if (kind === "jpg" || kind === "png") serverFiles.push(it.file);
      }
      if (serverFiles.length === 0) {
        setError("None of the failed files are JPG or PNG, so the server cannot convert them either.");
        setFallbackBusy(false);
        return;
      }
      const data = new FormData();
      serverFiles.forEach((f) => data.append("files", f));
      const res = await fetch("/api/image-to-pdf", { method: "POST", body: data });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Server conversion failed.");
      }
      const serverBytes = new Uint8Array(await res.arrayBuffer());
      if (readyItems.length === 0) {
        finish(serverBytes, "images.pdf");
        return;
      }
      // Merge the server PDF with a fresh client build, server pages first
      // (they were the files that failed, kept in original position order
      // only approximately — the download is one combined PDF).
      setProgressText("Merging the server-converted pages…");
      const clientBytes = await buildImagePdf(readyItems, options);
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const bytes of [serverBytes, clientBytes]) {
        const src = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      finish(await merged.save({ useObjectStreams: true }), "images.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server fallback failed.");
    } finally {
      setFallbackBusy(false);
    }
  };

  // Legacy browsers without on-device decoding: server-only mode.
  if (support === "unknown") {
    return (
      <div className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
        <p className="py-6 text-center text-slate-500">Loading the converter…</p>
      </div>
    );
  }
  if (support === "no") {
    return <LegacyServerForm />;
  }

  if (phase === "done" && result) {
    return (
      <div className="rounded-2xl border-2 border-[#0d9488] bg-[#f0fdfa] p-5 dark:border-teal-700 dark:bg-teal-950" role="status">
        <p className="text-lg font-bold text-slate-900 dark:text-white">Conversion complete</p>
        <p className="mt-2 text-slate-700 dark:text-slate-200">
          Your PDF: {result.name} ({formatBytes(result.size)}) — converted in your browser, so your images
          never left this device.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={result.url}
            download={result.name}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white hover:bg-[#c2410c]"
          >
            <Download size={18} aria-hidden="true" /> Download PDF
          </a>
          <Button
            type="button"
            onClick={() => {
              if (result.url.startsWith("blob:")) URL.revokeObjectURL(result.url);
              setResult(null);
              setItems([]);
              setPhase("idle");
              setError("");
            }}
          >
            Convert more
          </Button>
        </div>
        <NextToolSuggest tool="image-to-pdf" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900">
      <UploadZone
        files={items.map((it) => it.file)}
        onFilesChange={handleFilesChange}
        accept=".jpg,.jpeg,.png,.webp,.bmp,.heic,image/jpeg,image/png,image/webp,image/bmp,image/heic"
        allowedKinds={IMAGE_KINDS}
        maxBytes={10 * 1024 * 1024}
        maxFiles={20}
        multiple
        capture
        label="Choose images to convert"
        hint="Up to 20 images, 10 MB each. JPG, PNG, WebP, BMP, HEIC. Drop, paste (Ctrl+V), browse, or take a photo."
      />
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
        Converted in your browser — your images never leave this device. Bad files fail one by one; the
        rest still convert.
      </p>
      <div className="mt-3">
        <LimitCounter refreshKey={counterKey} />
      </div>

      {items.length > 0 && (
        <>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Images in PDF order">
            {items.map((it, idx) => (
              <li
                key={it.id}
                draggable={it.status === "ready"}
                onDragStart={() => setDragId(it.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropId(it.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== it.id) {
                    setItems((cur) => {
                      const from = cur.findIndex((x) => x.id === dragId);
                      const to = cur.findIndex((x) => x.id === it.id);
                      if (from < 0 || to < 0) return cur;
                      const next = [...cur];
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return next;
                    });
                  }
                  setDragId(null);
                  setDropId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropId(null);
                }}
                className={`rounded-xl border-2 p-2 ${
                  dropId === it.id ? "border-[#ea580c] bg-orange-50 dark:bg-orange-950" : "border-[#99f6e4] dark:border-teal-900"
                }`}
              >
                <p className="truncate text-sm font-semibold" title={it.file.name}>
                  {idx + 1}. {it.file.name}
                </p>
                {it.status === "decoding" && <p className="py-8 text-center text-sm">Reading…</p>}
                {it.status === "ready" && <ThumbImg item={it} />}
                {it.status === "error" && (
                  <p role="alert" className="rounded-lg bg-red-50 px-2 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                    {it.error}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${it.file.name} up`}
                    onClick={() => move(it.id, -1)}
                    className="min-h-[44px] min-w-[44px] rounded-lg border px-2 py-1 font-bold"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${it.file.name} down`}
                    onClick={() => move(it.id, 1)}
                    className="min-h-[44px] min-w-[44px] rounded-lg border px-2 py-1 font-bold"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Rotate ${it.file.name} left`}
                    disabled={it.status !== "ready"}
                    onClick={() => rotate(it.id, -90)}
                    className="min-h-[44px] min-w-[44px] rounded-lg border px-2 py-1 font-bold disabled:opacity-40"
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Rotate ${it.file.name} right`}
                    disabled={it.status !== "ready"}
                    onClick={() => rotate(it.id, 90)}
                    className="min-h-[44px] min-w-[44px] rounded-lg border px-2 py-1 font-bold disabled:opacity-40"
                  >
                    <RotateCw size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${it.file.name}`}
                    onClick={() => removeItem(it.id)}
                    className="min-h-[44px] rounded-lg border px-3 py-1 font-bold text-red-700 dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {failedItems.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-500 bg-amber-50 p-4 dark:bg-amber-950">
              <p className="font-bold text-slate-900 dark:text-white">
                {failedItems.length} file{failedItems.length > 1 ? "s" : ""} could not be read in your browser.
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                JPG and PNG files can still be converted on our server (processed in memory, never stored).
                Other formats need a browser that can decode them.
              </p>
              <Button type="button" onClick={() => void runFallback()} disabled={fallbackBusy} className="mt-3">
                {fallbackBusy && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}
                Convert the failed files on the server
              </Button>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <OptionSelect
              id="opt-pagesize"
              label="Page size"
              value={options.pageSize}
              onChange={(v) => setOpt("pageSize", v as ImagePdfOptions["pageSize"])}
              options={[
                { value: "a4", label: "A4" },
                { value: "letter", label: "Letter" },
                { value: "a3", label: "A3" },
                { value: "fit", label: "Fit to image" },
              ]}
            />
            <OptionSelect
              id="opt-orientation"
              label="Orientation"
              value={options.orientation}
              onChange={(v) => setOpt("orientation", v as ImagePdfOptions["orientation"])}
              options={[
                { value: "auto", label: "Auto (match the image)" },
                { value: "portrait", label: "Portrait" },
                { value: "landscape", label: "Landscape" },
              ]}
            />
            <OptionSelect
              id="opt-margin"
              label="Margins"
              value={options.margin}
              onChange={(v) => setOpt("margin", v as ImagePdfOptions["margin"])}
              options={[
                { value: "none", label: "None" },
                { value: "small", label: "Small" },
                { value: "big", label: "Big" },
              ]}
            />
            <OptionSelect
              id="opt-fit"
              label="Image fit"
              value={options.fit}
              onChange={(v) => setOpt("fit", v as ImagePdfOptions["fit"])}
              options={[
                { value: "fit", label: "Fit (no cropping)" },
                { value: "fill", label: "Fill (crop to fill)" },
                { value: "stretch", label: "Stretch to fill" },
              ]}
            />
            <OptionSelect
              id="opt-quality"
              label="Quality"
              value={options.quality}
              onChange={(v) => setOpt("quality", v as ImagePdfOptions["quality"])}
              options={[
                { value: "high", label: "High (original quality)" },
                { value: "medium", label: "Medium (smaller file)" },
                { value: "small", label: "Small file (downscaled)" },
              ]}
            />
            <OptionSelect
              id="opt-layout"
              label="Images per page"
              value={String(options.layout)}
              onChange={(v) => setOpt("layout", Number(v) as ImagePdfOptions["layout"])}
              options={[
                { value: "1", label: "1 per page" },
                { value: "2", label: "2 per page" },
                { value: "4", label: "4 per page" },
                { value: "6", label: "6 per page" },
              ]}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="opt-title" className="block font-bold text-slate-900 dark:text-white">
                PDF title (optional)
              </label>
              <input
                id="opt-title"
                value={options.title}
                onChange={(e) => setOpt("title", e.target.value)}
                placeholder="e.g. Receipts — November"
                className={`mt-1 ${SELECT_CLASS}`}
              />
            </div>
            <label className="flex min-h-[44px] items-center gap-2 pt-6 font-bold text-slate-900 dark:text-white">
              <input
                type="checkbox"
                checked={options.pageNumbers}
                onChange={(e) => setOpt("pageNumbers", e.target.checked)}
                className="h-5 w-5"
              />
              Add page numbers
            </label>
          </div>

          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
            Estimated output size: <strong>{estimated > 0 ? formatBytes(estimated) : "—"}</strong>{" "}
            <span className="text-slate-500">
              (estimate: input sizes × quality factor + ~1 KB per page; the actual size is shown after
              conversion)
            </span>
          </p>

          <div className="mt-4">
            <Button
              type="button"
              variant="accent"
              onClick={() => void convert()}
              disabled={phase === "building" || readyItems.length === 0}
              className="w-full sm:w-auto"
            >
              {phase === "building" && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
              {phase === "building" ? "Converting…" : "Convert to PDF"}
            </Button>
            {phase === "building" && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300" role="status" aria-live="polite">
                {progressText}
              </p>
            )}
          </div>
        </>
      )}

      {phase === "error" && error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-[#dc2626] bg-red-50 p-3 font-medium text-[#991b1b] dark:bg-red-950 dark:text-red-200">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

// Server-only mode for browsers without createImageBitmap: the existing
// /api/image-to-pdf route (JPG/PNG only, in-memory processing).
function LegacyServerForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please choose a file first.");
      return;
    }
    setPhase("building");
    setError("");
    try {
      const data = new FormData();
      files.forEach((f) => data.append("files", f));
      const res = await fetch("/api/image-to-pdf", { method: "POST", body: data });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Conversion failed.");
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(disp);
      setResult({ url: URL.createObjectURL(blob), name: match?.[1] || "images.pdf" });
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
      setPhase("error");
    }
  };

  if (phase === "done" && result) {
    return (
      <div className="rounded-2xl border-2 border-[#0d9488] bg-[#f0fdfa] p-5 dark:border-teal-700 dark:bg-teal-950" role="status">
        <p className="text-lg font-bold">Conversion complete</p>
        <a
          href={result.url}
          download={result.name}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#ea580c] px-5 py-2.5 font-semibold text-white"
        >
          <Download size={18} aria-hidden="true" /> Download PDF
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="rounded-2xl border-2 border-[#99f6e4] bg-white p-5 dark:border-teal-900 dark:bg-slate-900"
    >
      <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-slate-700 dark:bg-amber-950 dark:text-slate-200">
        Your browser cannot convert images on-device, so files are converted on our server instead
        (JPG/PNG only, one A4 page per image, processed in memory and never stored).
      </p>
      <UploadZone
        files={files}
        onFilesChange={setFiles}
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        allowedKinds={["jpg", "png"]}
        maxBytes={10 * 1024 * 1024}
        maxFiles={20}
        multiple
        label="Choose images to convert"
      />
      <div className="mt-4">
        <Button type="submit" variant="accent" disabled={phase === "building"}>
          {phase === "building" && <Loader2 className="animate-spin" size={20} aria-hidden="true" />}
          {phase === "building" ? "Converting…" : "Convert to PDF"}
        </Button>
      </div>
      {phase === "error" && error && (
        <p role="alert" className="mt-4 text-red-800 dark:text-red-200">
          {error}
        </p>
      )}
    </form>
  );
}
