// Browser image decoding: native formats via createImageBitmap with
// imageOrientation: "from-image" (fixes EXIF rotation from phone photos —
// verified by the Playwright EXIF test), HEIC via lazily-loaded heic2any
// (Safari can decode HEIC natively, other browsers cannot).
// BMP and WebP decode natively in modern browsers via createImageBitmap.
import { detectKind, type ClientFileKind } from "@/lib/file-detect";

export type DecodedImage = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  /** Bytes pdf-lib can embed without re-encoding (original JPG/PNG, or the
   *  heic2any-converted PNG for HEIC). Undefined for WebP/BMP, which are
   *  re-encoded from the bitmap at build time. */
  embedBytes?: Uint8Array;
  embedKind?: "png" | "jpg";
  kind: ClientFileKind;
  /** Object URL for the thumbnail (original file, or converted PNG for HEIC). */
  thumbUrl: string;
};

export async function decodeImageFile(file: File): Promise<DecodedImage> {
  const kind = await detectKind(file);
  if (kind === "heic") {
    // Lazy: heic2any bundles libheif (~1.3 MB) — never in the initial bundle.
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/png" });
    const pngBlob = (Array.isArray(out) ? out[0] : out) as Blob;
    const bitmap = await createImageBitmap(pngBlob, { imageOrientation: "from-image" });
    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      embedBytes: new Uint8Array(await pngBlob.arrayBuffer()),
      embedKind: "png",
      kind,
      thumbUrl: URL.createObjectURL(pngBlob),
    };
  }
  if (kind === "png" || kind === "jpg" || kind === "webp" || kind === "bmp") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const embed =
      kind === "png" || kind === "jpg"
        ? {
            embedBytes: new Uint8Array(await file.arrayBuffer()),
            embedKind: kind as "png" | "jpg",
          }
        : {};
    return {
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      ...embed,
      kind,
      thumbUrl: URL.createObjectURL(file),
    };
  }
  throw new Error(`"${file.name}" is not a supported image (JPG, PNG, WebP, BMP, HEIC).`);
}

/** Rotate a bitmap by a right angle. Returns a new ImageBitmap. */
export async function rotateBitmap(bitmap: ImageBitmap, degrees: 90 | -90 | 180): Promise<ImageBitmap> {
  const swap = Math.abs(degrees) === 90;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return createImageBitmap(canvas);
}

/** Render a bitmap (optionally rotated, optionally downscaled) to a JPEG blob. */
export async function bitmapToJpeg(
  bitmap: ImageBitmap,
  quality: number,
  maxSide?: number,
): Promise<Blob> {
  let w = bitmap.width;
  let h = bitmap.height;
  if (maxSide && Math.max(w, h) > maxSide) {
    const s = maxSide / Math.max(w, h);
    w = Math.round(w * s);
    h = Math.round(h * s);
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
  if (!blob) throw new Error("Could not encode the image.");
  return blob;
}

/** Render a bitmap to a PNG data URL for thumbnails (rotation applied). */
export function bitmapToDataUrl(bitmap: ImageBitmap, rotation: 0 | 90 | 180 | 270): string {
  const swap = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? bitmap.height : bitmap.width;
  canvas.height = swap ? bitmap.width : bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return canvas.toDataURL("image/png");
}
