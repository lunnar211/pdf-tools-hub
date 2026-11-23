// Image downsampling for compress-pdf.
//
// Large photos embedded in a PDF (phone scans, camera pictures) are usually
// stored at far more pixels than the page can show — a 3000 px wide photo
// drawn 6 inches wide is 500 DPI on paper. This module finds those images,
// works out the DPI they are actually drawn at from the page content
// streams, and re-encodes the oversized ones as smaller JPEGs with sharp.
//
// Only two image kinds are touched, and both are re-encoded as JPEG:
//   - DCTDecode (JPEG) — the raw bytes are a JPEG already.
//   - FlateDecode, DeviceRGB/DeviceGray, 8 bits, no transparency mask — the
//     raw pixels are inflated (PNG predictors undone) and handed to sharp.
// Everything else (JPEG 2000, CCITT fax, 1-bit masks, indexed colour,
// images with transparency) is left exactly as it is and counted as skipped.
// A single bad image never fails the whole file: it is skipped.
//
// The caller reports the counts honestly (X-Images-Downsampled header), so
// the result screen can say how many images actually changed.
import { inflateSync } from "zlib";
import sharp from "sharp";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from "pdf-lib";

export type DownsampleStats = {
  /** Image XObjects found in the document. */
  total: number;
  /** Images actually re-encoded smaller. */
  downsampled: number;
  /** Images left untouched (too small, unsupported kind, or failed). */
  skipped: number;
};

const JPEG_QUALITY = 75;

function asNumber(obj: unknown): number | undefined {
  if (obj instanceof PDFNumber) return obj.asNumber();
  return undefined;
}

/** PDFName.asString() keeps the leading slash ("/Image") — strip it. */
function nameString(n: PDFName): string {
  const s = n.asString();
  return s.startsWith("/") ? s.slice(1) : s;
}

function filterNames(dict: PDFDict): string[] {
  const f = dict.get(PDFName.of("Filter"));
  if (f instanceof PDFName) return [nameString(f)];
  if (f instanceof PDFArray) {
    return f
      .asArray()
      .filter((v): v is PDFName => v instanceof PDFName)
      .map((v) => nameString(v));
  }
  return [];
}

function colorSpaceName(dict: PDFDict): string | undefined {
  const cs = dict.get(PDFName.of("ColorSpace"));
  if (cs instanceof PDFName) return nameString(cs);
  if (cs instanceof PDFArray) {
    const first = cs.asArray()[0];
    if (first instanceof PDFName) return nameString(first);
  }
  return undefined;
}

/** Decode a FlateDecode image's raw pixels, undoing PNG predictors. */
function inflatePixels(
  bytes: Uint8Array,
  width: number,
  height: number,
  channels: number,
  predictor: number,
): Buffer {
  const inflated = inflateSync(bytes);
  const rowBytes = width * channels;
  if (predictor < 10) return Buffer.from(inflated);
  // PNG predictors: each row starts with a filter-type byte (0 None, 1 Sub,
  // 2 Up, 3 Average, 4 Paeth), exactly like a PNG scanline.
  const bpp = channels; // 8 bits per component
  const out = Buffer.alloc(rowBytes * height);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const rowStart = y * rowBytes;
    const prevStart = (y - 1) * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = inflated[src++];
      const left = x >= bpp ? out[rowStart + x - bpp] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevStart + x - bpp] : 0;
      let v: number;
      switch (filter) {
        case 1:
          v = raw + left;
          break;
        case 2:
          v = raw + up;
          break;
        case 3:
          v = raw + Math.floor((left + up) / 2);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          v = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          v = raw;
      }
      out[rowStart + x] = v & 0xff;
    }
  }
  return out;
}

/**
 * Find, for one page, the drawn width (in points) of each image XObject name
 * it uses, by reading the page content stream for `w 0 0 h x y cm /Name Do`.
 * The width of the drawn image is the length of the first row of the matrix.
 */
function drawnWidthsForPage(page: ReturnType<PDFDocument["getPages"]>[number]): Map<string, number> {
  const widths = new Map<string, number>();
  const contents = page.node.Contents();
  if (!contents) return widths;
  const streams: PDFStream[] = [];
  if (contents instanceof PDFArray) {
    for (const el of contents.asArray()) {
      if (el instanceof PDFRef) {
        const s = page.doc.context.lookup(el, PDFStream);
        if (s) streams.push(s);
      }
    }
  } else if (contents instanceof PDFStream) {
    streams.push(contents);
  }
  for (const stream of streams) {
    let text: string;
    try {
      const bytes = stream.getContents();
      try {
        text = inflateSync(bytes).toString("latin1");
      } catch {
        text = Buffer.from(bytes).toString("latin1");
      }
    } catch {
      continue;
    }
    // `a b c d e f cm` (up to a few hundred chars of other operators may sit
    // between the matrix and the Do) then `/Name Do`.
    const re =
      /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+cm[\s\S]{0,400}?\/([A-Za-z0-9_.$]+)\s+Do/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const widthPt = Math.hypot(a, b);
      if (!Number.isFinite(widthPt) || widthPt <= 0) continue;
      const name = m[7];
      widths.set(name, Math.max(widths.get(name) ?? 0, widthPt));
    }
  }
  return widths;
}

type FoundImage = {
  ref: PDFRef;
  stream: PDFRawStream;
  dict: PDFDict;
  drawnWidthPt: number;
  pageWidthPt: number;
};

/** Downsample oversized images in `doc` to at most `targetDpi` effective DPI. */
export async function downsamplePdfImages(doc: PDFDocument, targetDpi: number): Promise<DownsampleStats> {
  const stats: DownsampleStats = { total: 0, downsampled: 0, skipped: 0 };
  const found = new Map<number, FoundImage>();

  for (const page of doc.getPages()) {
    const pageWidthPt = page.getWidth();
    const resources = page.node.Resources();
    if (!resources) continue;
    const xobjects = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
    if (!xobjects) continue;
    const drawn = drawnWidthsForPage(page);
    for (const [name, obj] of xobjects.entries()) {
      if (!(obj instanceof PDFRef)) continue;
      const maybeStream = doc.context.lookup(obj);
      if (!(maybeStream instanceof PDFRawStream)) continue;
      const stream = maybeStream;
      const dict = stream.dict;
      const subtype = dict.get(PDFName.of("Subtype"));
      if (!(subtype instanceof PDFName) || nameString(subtype) !== "Image") continue;
      const key = obj.objectNumber;
      const drawnWidthPt = drawn.get(nameString(name));
      const prev = found.get(key);
      if (prev) {
        if (drawnWidthPt !== undefined) prev.drawnWidthPt = Math.max(prev.drawnWidthPt, drawnWidthPt);
      } else {
        found.set(key, {
          ref: obj,
          stream,
          dict,
          drawnWidthPt: drawnWidthPt ?? 0,
          pageWidthPt,
        });
      }
    }
  }

  for (const img of found.values()) {
    stats.total++;
    try {
      const dict = img.dict;
      const width = asNumber(dict.get(PDFName.of("Width")));
      const height = asNumber(dict.get(PDFName.of("Height")));
      const bits = asNumber(dict.get(PDFName.of("BitsPerComponent")));
      if (!width || !height || width <= 0 || height <= 0 || bits !== 8) {
        stats.skipped++;
        continue;
      }
      // Transparency masks keep their alpha in a separate stream — a JPEG
      // re-encode would drop it, so those images stay untouched.
      if (dict.has(PDFName.of("SMask"))) {
        stats.skipped++;
        continue;
      }
      // No drawn size found (image never painted): fall back to full page
      // width, the most conservative reading — it only ever understates DPI.
      const drawnWidthPt = img.drawnWidthPt > 0 ? img.drawnWidthPt : img.pageWidthPt;
      const effectiveDpi = width / (drawnWidthPt / 72);
      if (effectiveDpi <= targetDpi) {
        stats.skipped++;
        continue;
      }
      const scale = targetDpi / effectiveDpi;
      const newWidth = Math.max(1, Math.round(width * scale));
      const newHeight = Math.max(1, Math.round(height * scale));
      const filters = filterNames(dict);
      const space = colorSpaceName(dict);

      let input: ReturnType<typeof sharp>;
      let channels: 1 | 3;
      if (filters.includes("DCTDecode")) {
        channels = space === "DeviceGray" ? 1 : 3;
        input = sharp(img.stream.getContents());
      } else if (filters.includes("FlateDecode")) {
        if (space === "DeviceRGB") channels = 3;
        else if (space === "DeviceGray") channels = 1;
        else {
          stats.skipped++;
          continue;
        }
        const parms = dict.get(PDFName.of("DecodeParms"));
        const parmsDict = parms instanceof PDFDict ? parms : undefined;
        const predictor = asNumber(parmsDict?.get(PDFName.of("Predictor"))) ?? 1;
        const pixels = inflatePixels(img.stream.getContents(), width, height, channels, predictor);
        input = sharp(pixels, { raw: { width, height, channels } });
      } else {
        // JPEG 2000, CCITT fax, LZW, RunLength, ASCII — left as they are.
        stats.skipped++;
        continue;
      }

      const out = await input.resize(newWidth, newHeight).jpeg({ quality: JPEG_QUALITY }).toBuffer();
      const newDict = PDFDict.withContext(doc.context);
      newDict.set(PDFName.of("Type"), PDFName.of("XObject"));
      newDict.set(PDFName.of("Subtype"), PDFName.of("Image"));
      newDict.set(PDFName.of("Width"), PDFNumber.of(newWidth));
      newDict.set(PDFName.of("Height"), PDFNumber.of(newHeight));
      newDict.set(PDFName.of("ColorSpace"), PDFName.of(channels === 1 ? "DeviceGray" : "DeviceRGB"));
      newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
      newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
      newDict.set(PDFName.of("Length"), PDFNumber.of(out.length));
      doc.context.assign(img.ref, PDFRawStream.of(newDict, new Uint8Array(out)));
      stats.downsampled++;
    } catch {
      // One bad image never fails the whole file — leave it as it was.
      stats.skipped++;
    }
  }
  return stats;
}
