// Client-safe file-kind detection by magic bytes (no Node Buffer, so this
// module is importable from browser components). Mirrors the server-side
// checks in lib/files.ts, extended with WebP / BMP / HEIC / GIF so the
// upload zone can validate by CONTENT, not just extension.
export type ClientFileKind = "pdf" | "png" | "jpg" | "webp" | "bmp" | "heic" | "gif" | "zip" | "unknown";

const HEIC_BRANDS = new Set([
  "heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1",
]);

export function detectKindFromBytes(bytes: Uint8Array): ClientFileKind {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "pdf";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpg";
  }
  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "webp";
  }
  // BMP: "BM"
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  // HEIC: ....ftyp<brand> (brand at bytes 8-11)
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    if (HEIC_BRANDS.has(brand)) return "heic";
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46
  ) {
    return "gif";
  }
  // ZIP archives (including .docx, which is a ZIP) start with "PK\x03\x04".
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  ) {
    return "zip";
  }
  return "unknown";
}

export async function detectKind(file: File): Promise<ClientFileKind> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return detectKindFromBytes(head);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validate one file by size AND content. Returns an error string, or null when OK. */
export async function validateClientFile(
  file: File,
  allowed: ClientFileKind[],
  maxBytes: number,
): Promise<string | null> {
  if (file.size === 0) return `"${file.name}" is empty.`;
  if (file.size > maxBytes) {
    return `"${file.name}" is ${formatBytes(file.size)} — the limit is ${formatBytes(maxBytes)} per file.`;
  }
  const kind = await detectKind(file);
  if (kind === "unknown") {
    return `"${file.name}" is not a recognised file (its contents do not match its extension).`;
  }
  if (!allowed.includes(kind)) {
    return `"${file.name}" is a ${kind.toUpperCase()} file, which this tool does not accept.`;
  }
  return null;
}

export const IMAGE_KINDS: ClientFileKind[] = ["png", "jpg", "webp", "bmp", "heic"];
export const PDF_KINDS: ClientFileKind[] = ["pdf"];
