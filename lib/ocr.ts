// Browser OCR via Tesseract.js, lazy-loaded on demand only (the wasm +
// worker are heavy — they must never be in the initial bundle). English
// only. A single worker is created once per page session and reused across
// pages; it is terminated when the tool resets or unmounts.
// ALL OCR assets are vendored same-origin under public/tesseract/ (worker,
// core wasm variants, English traineddata) — nothing loads from a CDN, so
// OCR works even where CDNs are blocked, and the sandbox Playwright run can
// verify it. The worker runs directly from its file (workerBlobURL: false)
// rather than via a blob + importScripts hop.
export type OcrWord = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type OcrPageResult = {
  text: string;
  words: OcrWord[];
  width: number;
  height: number;
};

type TesseractWorker = {
  recognize: (
    image: Blob,
  ) => Promise<{ data: { text: string; words: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[] } }>;
  terminate: () => Promise<void>;
};

let worker: TesseractWorker | null = null;
let workerInit: Promise<TesseractWorker> | null = null;

export async function getOcrWorker(
  onProgress: (status: string, progress: number) => void,
): Promise<TesseractWorker> {
  if (worker) return worker;
  if (!workerInit) {
    workerInit = (async () => {
      const { createWorker } = await import("tesseract.js");
      const w = await createWorker("eng", undefined, {
        workerPath: "/tesseract/worker.min.js",
        // Directory: the worker picks the SIMD variant the browser supports
        // (relaxedsimd-lstm / simd-lstm / lstm) from this folder.
        corePath: "/tesseract",
        langPath: "/tesseract/tessdata",
        workerBlobURL: false,
        logger: (m: { status: string; progress?: number }) => onProgress(m.status, m.progress ?? 0),
      });
      worker = w as unknown as TesseractWorker;
      return worker;
    })();
  }
  return workerInit;
}

export async function terminateOcrWorker(): Promise<void> {
  try {
    await worker?.terminate();
  } catch {
    // ignore
  }
  worker = null;
  workerInit = null;
}

export async function recognizeImage(
  blob: Blob,
  onProgress: (status: string, progress: number) => void,
): Promise<OcrPageResult> {
  const w = await getOcrWorker(onProgress);
  const { data } = await w.recognize(blob);
  // Image pixel size: read from the blob via an <img> element.
  const size = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the rendered page image."));
    };
    img.src = url;
  });
  const words: OcrWord[] = (data.words ?? [])
    .filter((wd) => wd.text.trim().length > 0)
    .map((wd) => ({ text: wd.text, x0: wd.bbox.x0, y0: wd.bbox.y0, x1: wd.bbox.x1, y1: wd.bbox.y1 }));
  return { text: data.text ?? "", words, width: size.width, height: size.height };
}

/**
 * Build a searchable PDF: each rendered page image as a full-page image,
 * with the recognised words drawn on top at opacity 0. pdf.js (and other
 * readers) extract text regardless of opacity, so the result is searchable
 * and copyable while looking identical to the scan.
 */
export async function buildSearchablePdf(
  pages: { image: Blob; ocr: OcrPageResult }[],
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const { image, ocr } of pages) {
    const bytes = new Uint8Array(await image.arrayBuffer());
    const embedded = await doc.embedJpg(bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
    const scaleX = embedded.width / ocr.width;
    const scaleY = embedded.height / ocr.height;
    for (const word of ocr.words) {
      const size = Math.max(4, (word.y1 - word.y0) * scaleY);
      page.drawText(word.text, {
        x: word.x0 * scaleX,
        // PDF origin is bottom-left; OCR origin is top-left.
        y: embedded.height - word.y1 * scaleY,
        size,
        font,
        color: rgb(0, 0, 0),
        opacity: 0,
      });
    }
  }
  return doc.save({ useObjectStreams: true });
}
