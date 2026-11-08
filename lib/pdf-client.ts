// Browser PDF operations (pdf-lib + pdf.js), all dynamically imported so
// none of this lands in the initial bundle. pdf.js uses the same in-process
// fake-worker trick as the server route (worker module registered on
// globalThis) — no separate worker file or CSP worker-src entry needed for
// pdf.js itself.
export async function loadPdfLib() {
  return import("pdf-lib");
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> | null = null;

/**
 * Old Safari (before Safari 18 / iOS 18) has no
 * `ReadableStream.prototype[Symbol.asyncIterator]`, and pdf.js's
 * `page.getTextContent()` iterates the text stream with `for await...of`.
 * The page still renders — rendering never touches that API, and
 * `Promise.withResolvers` is polyfilled by core-js in the bundle — so the
 * tool looks fine until text extraction throws "undefined is not a
 * function (near '...t of e...')": the minified for-await loop over the
 * stream. Install the standard WHATWG async-iterator adapter before
 * pdf.js loads, so text extraction works on old Safari too. No-op on
 * browsers that already have the method.
 */
export function ensureReadableStreamAsyncIterator(): void {
  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as unknown as Record<symbol, unknown>;
  if (typeof proto[Symbol.asyncIterator] === "function") return;
  const iterator = function (
    this: ReadableStream,
  ): AsyncIterator<unknown> & { [Symbol.asyncIterator](): AsyncIterator<unknown> } {
    const reader = this.getReader();
    return {
      async next() {
        const r = await reader.read();
        return { value: r.value, done: r.done };
      },
      async return() {
        await reader.cancel();
        return { done: true, value: undefined };
      },
      async throw(err: unknown) {
        await reader.cancel(err);
        throw err;
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
  Object.defineProperty(proto, Symbol.asyncIterator, {
    value: iterator,
    writable: true,
    configurable: true,
  });
}

export async function loadPdfjs() {
  ensureReadableStreamAsyncIterator();
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const workerMod = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
      (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = workerMod;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export async function fileToBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export async function countPdfPages(bytes: Uint8Array): Promise<number> {
  const { PDFDocument } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}

/** Rotate pages: rotations[i] is the degrees for original page i. */
export async function rotatePdf(bytes: Uint8Array, rotations: number[]): Promise<Uint8Array> {
  const { PDFDocument, degrees } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const r = rotations[i] ?? 0;
    if (r !== 0) page.setRotation(degrees(r));
  });
  return doc.save({ useObjectStreams: true });
}

/** Reorder + delete: order lists original page indices in the new order;
 *  deleted indices are skipped. */
export async function organizePdf(
  bytes: Uint8Array,
  order: number[],
  deleted: Set<number>,
): Promise<Uint8Array> {
  const { PDFDocument } = await loadPdfLib();
  const src = await PDFDocument.load(bytes);
  const out = await PDFDocument.create();
  const keep = order.filter((i) => !deleted.has(i));
  if (keep.length === 0) throw new Error("Delete every page would leave an empty PDF — keep at least one page.");
  const pages = await out.copyPages(src, keep);
  pages.forEach((p) => out.addPage(p));
  return out.save({ useObjectStreams: true });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 0.5, g: 0.5, b: 0.5 };
  const v = parseInt(m[1], 16);
  return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 };
}

export type WatermarkOptions = {
  text: string;
  opacity: number; // 0-1
  size: number;
  color: string; // #rrggbb
};

/** One diagonal watermark, centred, on every page. */
export async function watermarkPdf(bytes: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const { r, g, b } = hexToRgb(opts.color);
  const angle = -45;
  const rad = (angle * Math.PI) / 180;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, opts.size);
    // Centre the rotated text's midpoint on the page centre.
    const x = width / 2 - (Math.cos(rad) * textWidth) / 2;
    const y = height / 2 - (Math.sin(rad) * textWidth) / 2;
    page.drawText(opts.text, {
      x,
      y,
      size: opts.size,
      font,
      color: rgb(r, g, b),
      opacity: opts.opacity,
      rotate: degrees(angle),
    });
  }
  return doc.save({ useObjectStreams: true });
}

export type PageNumberOptions = {
  position: "center" | "right";
  size: number;
  /** Number printed on the first page (lets front matter stay unnumbered). */
  startAt: number;
};

export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const { width } = page.getSize();
    const text = `Page ${opts.startAt + i} of ${opts.startAt + pages.length - 1}`;
    const textWidth = font.widthOfTextAtSize(text, opts.size);
    const x = opts.position === "center" ? width / 2 - textWidth / 2 : width - textWidth - 36;
    page.drawText(text, { x, y: 24, size: opts.size, font, color: rgb(0.4, 0.4, 0.4) });
  });
  return doc.save({ useObjectStreams: true });
}

/** Render every page to a JPEG blob (for PDF to JPG + OCR). */
export async function renderPdfPagesToJpegs(
  bytes: Uint8Array,
  scale: number,
  jpegQuality: number,
  onPage?: (done: number, total: number) => void,
): Promise<Blob[]> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const out: Blob[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", jpegQuality));
    if (!blob) throw new Error("Could not render a page to JPG.");
    out.push(blob);
    onPage?.(p, doc.numPages);
  }
  return out;
}

/** Small thumbnails (longest side ≈ 220 px) as data URLs, for page grids. */
export async function renderPageThumbnails(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const thumbs: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const scale = 220 / Math.max(base.width, base.height);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, viewport }).promise;
    thumbs.push(canvas.toDataURL("image/png"));
  }
  return thumbs;
}
