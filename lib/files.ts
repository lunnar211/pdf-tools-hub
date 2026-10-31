// File validation: MIME type AND magic bytes (first bytes read directly).
// Never trust the extension or the client-supplied MIME type alone.
import { z } from "zod";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 20;

export type FileKind = "pdf" | "png" | "jpg" | "docx";

const MAGIC: Record<FileKind, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  png: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  jpg: [[0xff, 0xd8, 0xff]],
  docx: [[0x50, 0x4b, 0x03, 0x04]], // PK zip container
};

const MIMES: Record<FileKind, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg", "image/jpg"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export function detectKind(buf: Buffer): FileKind | null {
  for (const kind of Object.keys(MAGIC) as FileKind[]) {
    for (const sig of MAGIC[kind]) {
      if (buf.length >= sig.length && sig.every((b, i) => buf[i] === b)) return kind;
    }
  }
  return null;
}

export function validateUpload(
  buf: Buffer,
  mime: string,
  expected: FileKind[],
  maxBytes: number
): string | null {
  if (buf.length === 0) return "The uploaded file is empty.";
  if (buf.length > maxBytes) return `File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  const kind = detectKind(buf);
  if (!kind || !expected.includes(kind)) return "File type not recognised. Please upload a file of the expected type.";
  // MIME is a secondary check only: reject an obviously conflicting MIME,
  // but allow generic octet-stream (some browsers send it).
  if (mime && mime !== "application/octet-stream" && !expected.some((k) => MIMES[k].includes(mime))) {
    return "File type does not match its contents. Please upload a genuine file of the expected type.";
  }
  return null;
}

export function sanitizeFilename(name: string, fallback: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").replace(/^\.+/, "").slice(0, 100) || fallback;
  return base;
}

export function outputName(input: string, suffix: string, ext: string): string {
  const stem = input.replace(/\.[^.]*$/, "") || "document";
  return sanitizeFilename(`${stem}${suffix}.${ext}`, `converted.${ext}`);
}

export const rangeSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^\d+(-\d+)?(,\d+(-\d+)?)*$/, "Page ranges must look like 1-3,5");

export function parseRanges(raw: string, pageCount: number): { ranges: [number, number][]; error: string | null } {
  const ranges: [number, number][] = [];
  for (const part of raw.split(",")) {
    const [a, b] = part.split("-").map((n) => parseInt(n, 10));
    const start = a;
    const end = b ?? a;
    if (start < 1 || end < start || end > pageCount) {
      return { ranges: [], error: `Page range "${part}" is outside this PDF (1-${pageCount}).` };
    }
    ranges.push([start, end]);
  }
  return { ranges, error: null };
}

export function fileResponse(
  bytes: Uint8Array,
  filename: string,
  contentType: string
): Response {
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${sanitizeFilename(filename, "converted")}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
