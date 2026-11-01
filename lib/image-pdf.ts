// Image → PDF building (browser). pdf-lib is dynamically imported so it
// never bloats the initial bundle. Pure helpers (page size, grid cells,
// size estimate) are exported for unit tests.
import type { DecodedImage } from "@/lib/image-decode";
import { bitmapToJpeg } from "@/lib/image-decode";

export type PageSizeOpt = "a4" | "letter" | "a3" | "fit";
export type OrientationOpt = "auto" | "portrait" | "landscape";
export type MarginOpt = "none" | "small" | "big";
export type FitOpt = "fit" | "fill" | "stretch";
export type QualityOpt = "high" | "medium" | "small";
export type LayoutOpt = 1 | 2 | 4 | 6;

export type ImagePdfOptions = {
  pageSize: PageSizeOpt;
  orientation: OrientationOpt;
  margin: MarginOpt;
  fit: FitOpt;
  quality: QualityOpt;
  layout: LayoutOpt;
  pageNumbers: boolean;
  title: string;
};

export type PdfImageItem = {
  image: DecodedImage;
  /** User rotation applied on top of the (already EXIF-corrected) bitmap. */
  rotation: 0 | 90 | 180 | 270;
  /** Original file size, for the estimate. */
  inputBytes: number;
};

const PAGE_SIZES: Record<Exclude<PageSizeOpt, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  a3: [841.89, 1190.55],
};

export const MARGIN_PTS: Record<MarginOpt, number> = { none: 0, small: 36, big: 72 };

const QUALITY_JPEG: Record<QualityOpt, number> = { high: 0.92, medium: 0.75, small: 0.5 };

export function effectiveDims(item: PdfImageItem): [number, number] {
  const { width, height } = item.image;
  return item.rotation === 90 || item.rotation === 270 ? [height, width] : [width, height];
}

/** Page size in PDF points for one image (or a fixed page for grids). */
export function pageSizeFor(
  opt: PageSizeOpt,
  orientation: OrientationOpt,
  imgW: number,
  imgH: number,
): [number, number] {
  if (opt === "fit") {
    // Fit-to-image: page = image aspect, capped at A3's long side so a
    // 50 MP phone photo does not produce a poster-sized page.
    const maxSide = 1190.55;
    const scale = Math.min(1, maxSide / Math.max(imgW, imgH));
    const w = imgW * scale;
    const h = imgH * scale;
    if (orientation === "portrait") return h >= w ? [w, h] : [h, w];
    if (orientation === "landscape") return w >= h ? [w, h] : [h, w];
    return [w, h];
  }
  const [w, h] = PAGE_SIZES[opt];
  if (orientation === "portrait") return [Math.min(w, h), Math.max(w, h)];
  if (orientation === "landscape") return [Math.max(w, h), Math.min(w, h)];
  // auto: match the image's orientation
  return imgW >= imgH ? [Math.max(w, h), Math.min(w, h)] : [Math.min(w, h), Math.max(w, h)];
}

/** Grid cells for a multi-image page: 2 = stacked, 4 = 2x2, 6 = 2x3. */
export function layoutCells(
  pageW: number,
  pageH: number,
  margin: number,
  layout: LayoutOpt,
): { x: number; y: number; w: number; h: number }[] {
  const cols = layout === 1 || layout === 2 ? 1 : 2;
  const rows = layout === 1 ? 1 : layout === 2 ? 2 : layout === 4 ? 2 : 3;
  const innerW = pageW - margin * 2;
  const innerH = pageH - margin * 2;
  const cellW = innerW / cols;
  const cellH = innerH / rows;
  const cells: { x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: margin + c * cellW, y: pageH - margin - (r + 1) * cellH, w: cellW, h: cellH });
    }
  }
  return cells;
}

/**
 * Estimated output size, labelled as an estimate in the UI. Basis: input
 * sizes scaled by a quality factor (JPEG re-encode shrinks photos; PNG
 * screenshots shrink less, so the factor is conservative) + ~1 KB per page
 * of PDF structure. Never presented as exact.
 */
export function estimatePdfBytes(items: PdfImageItem[], options: ImagePdfOptions): number {
  const factor = options.quality === "high" ? 1.0 : options.quality === "medium" ? 0.6 : 0.35;
  const inputSum = items.reduce((s, it) => s + it.inputBytes, 0);
  const pages = Math.ceil(items.length / options.layout);
  return Math.round(inputSum * factor + pages * 1024);
}

type PlacedImage = {
  bytes: Uint8Array;
  kind: "png" | "jpg";
  w: number;
  h: number;
};

/** Prepare one image's embed bytes for a target cell (fit/fill/stretch). */
async function prepareImage(
  item: PdfImageItem,
  cellW: number,
  cellH: number,
  options: ImagePdfOptions,
): Promise<PlacedImage> {
  const [w, h] = effectiveDims(item);
  let bitmap = item.image.bitmap;
  if (item.rotation !== 0) {
    const { rotateBitmap } = await import("@/lib/image-decode");
    bitmap = await rotateBitmap(bitmap, item.rotation as 90 | -90 | 180);
  }
  if (options.quality !== "high") {
    // Medium/small: JPEG re-encode (small also downscales to 1600 px).
    const blob = await bitmapToJpeg(
      bitmap,
      QUALITY_JPEG[options.quality],
      options.quality === "small" ? 1600 : undefined,
    );
    return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "jpg", w, h };
  }
  if (options.fit === "stretch") {
    // Stretch needs a distorted bitmap: render the bitmap into a canvas at
    // the cell aspect ratio, then embed as PNG.
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("Could not encode the image.");
    return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "png", w, h };
  }
  if (options.fit === "fill") {
    // Cover-crop: crop the bitmap to the cell aspect ratio first, so the
    // PDF embed itself is a plain full-cell image (no clip paths needed).
    const targetAspect = cellW / cellH;
    const srcAspect = w / h;
    let sx = 0;
    let sy = 0;
    let sw = w;
    let sh = h;
    if (srcAspect > targetAspect) {
      sw = Math.round(h * targetAspect);
      sx = Math.round((w - sw) / 2);
    } else {
      sh = Math.round(w / targetAspect);
      sy = Math.round((h - sh) / 2);
    }
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("Could not encode the image.");
    return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "png", w: sw, h: sh };
  }
  // fit + high + no rotation: embed the original bytes untouched (or the
  // HEIC-converted PNG). With a rotation applied, the rotated bitmap must
  // be encoded instead — the original bytes are unrotated.
  if (item.rotation === 0 && item.image.embedBytes && item.image.embedKind) {
    return { bytes: item.image.embedBytes, kind: item.image.embedKind, w, h };
  }
  // WebP/BMP high, or any rotated image: PNG-encode the (possibly rotated) bitmap.
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("Could not encode the image.");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: "png", w, h };
}

/** Draw one placed image into a cell, honouring fit/fill/stretch. */
function drawIntoCell(
  page: { drawImage: (img: unknown, o: Record<string, number>) => void },
  embedded: unknown,
  cell: { x: number; y: number; w: number; h: number },
  imgW: number,
  imgH: number,
  fit: FitOpt,
): void {
  if (fit === "fill" || fit === "stretch") {
    page.drawImage(embedded, { x: cell.x, y: cell.y, width: cell.w, height: cell.h });
    return;
  }
  // fit: contain, centred
  const scale = Math.min(cell.w / imgW, cell.h / imgH);
  const dw = imgW * scale;
  const dh = imgH * scale;
  page.drawImage(embedded, { x: cell.x + (cell.w - dw) / 2, y: cell.y + (cell.h - dh) / 2, width: dw, height: dh });
}

export async function buildImagePdf(
  items: PdfImageItem[],
  options: ImagePdfOptions,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  if (items.length === 0) throw new Error("Add at least one image first.");
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  if (options.title.trim()) doc.setTitle(options.title.trim());
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const margin = MARGIN_PTS[options.margin];
  const totalPages = Math.ceil(items.length / options.layout);
  for (let p = 0; p < totalPages; p++) {
    const pageItems = items.slice(p * options.layout, (p + 1) * options.layout);
    // Page size: fit-to-image uses the FIRST image on the page; fixed sizes
    // use the first image's orientation only for "auto".
    const [firstW, firstH] = effectiveDims(pageItems[0]);
    const [pageW, pageH] = pageSizeFor(options.pageSize, options.orientation, firstW, firstH);
    const page = doc.addPage([pageW, pageH]);
    const cells = layoutCells(pageW, pageH, margin, options.layout);
    for (let i = 0; i < pageItems.length; i++) {
      const prepared = await prepareImage(pageItems[i], cells[i].w, cells[i].h, options);
      const embedded =
        prepared.kind === "png" ? await doc.embedPng(prepared.bytes) : await doc.embedJpg(prepared.bytes);
      drawIntoCell(
        page as unknown as { drawImage: (img: unknown, o: Record<string, number>) => void },
        embedded,
        cells[i],
        prepared.w,
        prepared.h,
        options.fit,
      );
    }
    if (options.pageNumbers) {
      page.drawText(`Page ${p + 1} of ${totalPages}`, {
        x: pageW / 2 - 30,
        y: Math.max(12, margin / 2 - 5),
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
    onProgress?.(p + 1, totalPages);
  }
  return doc.save({ useObjectStreams: true });
}
