// Edit PDF text (browser): extract text lines with positions, then rebuild
// the PDF with edited text redrawn at the same coordinates.
// Two layers of honesty:
//  1. Where possible the ORIGINAL text is removed from the page's content
//     stream (so a text search no longer finds the old words). Where the
//     file stores text in a custom font encoding the old words cannot be
//     matched, so they are covered with a white rectangle instead —
//     invisible on the page, but still findable by text search. The UI
//     says this plainly.
//  2. The original embedded font usually cannot be reused, so edited text
//     is redrawn in a standard font (Helvetica family) at the same size
//     and position. Layout stays the same; letter shapes may differ
//     slightly. Longer text is shrunk slightly to fit the original space.
import {
  PDFName,
  PDFRef,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

/** Pages shown for editing at once (rendering cost); the rest stay untouched. */
export const MAX_EDIT_PAGES = 30;
/** Largest PDF the editor accepts (same as the other tools). */
export const MAX_EDIT_BYTES = 25 * 1024 * 1024;

export type TextLine = {
  /** Stable id inside the editor: `${pageIndex}:${lineIndex}`. */
  id: string;
  pageIndex: number;
  /** Text as it appears on the page. */
  text: string;
  /** Overlay position, CSS px at the render scale. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Font size, CSS px at the render scale. */
  fontSize: number;
  /** PDF user-space coordinates (points, origin bottom-left). */
  pdfX: number;
  pdfBaselineY: number;
  pdfWidth: number;
  pdfTop: number;
  pdfBottom: number;
  /** Font size in PDF points. */
  pdfFontSize: number;
  bold: boolean;
  italic: boolean;
};

export type TextEdit = {
  pageIndex: number;
  originalText: string;
  newText: string;
  pdfX: number;
  pdfBaselineY: number;
  pdfWidth: number;
  pdfTop: number;
  pdfBottom: number;
  pdfFontSize: number;
  bold: boolean;
  italic: boolean;
};

const norm = (t: string) => t.replace(/\s+/g, " ").trim();

function isTextItem(item: unknown): item is TextItem {
  return typeof item === "object" && item !== null && "str" in item && "transform" in item;
}

/** Group pdf.js text items into visual lines (same baseline, left to right). */
export function groupTextItems(items: TextItem[]): { text: string; items: TextItem[] }[] {
  const usable = items.filter((i) => i.str && i.str.trim().length > 0);
  const sorted = [...usable].sort((a, b) => {
    const dy = (a.transform[5] as number) - (b.transform[5] as number);
    if (Math.abs(dy) > 1) return dy;
    return (a.transform[4] as number) - (b.transform[4] as number);
  });
  const lines: { text: string; items: TextItem[] }[] = [];
  for (const item of sorted) {
    const y = item.transform[5] as number;
    const size = Math.hypot(
      (item.transform[2] as number) || 0,
      (item.transform[3] as number) || 0,
    );
    const last = lines[lines.length - 1];
    const lastY = last ? (last.items[0].transform[5] as number) : null;
    if (last && lastY !== null && Math.abs(y - lastY) <= Math.max(2, size * 0.25)) {
      last.items.push(item);
    } else {
      lines.push({ text: "", items: [item] });
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => (a.transform[4] as number) - (b.transform[4] as number));
    let text = "";
    for (let i = 0; i < line.items.length; i++) {
      const item = line.items[i];
      if (i > 0) {
        const prev = line.items[i - 1];
        const gap =
          (item.transform[4] as number) - ((prev.transform[4] as number) + prev.width);
        const size = Math.max(1, Math.hypot((item.transform[2] as number) || 0, (item.transform[3] as number) || 0));
        if (gap > size * 0.3) text += " ";
      }
      text += item.str;
    }
    line.text = text.trim();
  }
  return lines.filter((l) => l.text.length > 0);
}

function styleOf(fontName: string): { bold: boolean; italic: boolean } {
  const n = (fontName || "").toLowerCase();
  return { bold: n.includes("bold"), italic: n.includes("italic") || n.includes("oblique") };
}

/**
 * Render one page into a canvas and return its editable text lines.
 * `scale` is display px per PDF point; overlay coordinates are CSS px.
 */
export async function renderEditablePage(
  doc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<TextLine[]> {
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale });
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, viewport }).promise;
  const content = await page.getTextContent();
  const items = content.items.filter(isTextItem);
  const lines: TextLine[] = [];
  for (const [lineIndex, group] of groupTextItems(items).entries()) {
    const first = group.items[0];
    let x0 = Infinity;
    let x1 = -Infinity;
    let top = Infinity;
    let bottom = -Infinity;
    let fontSizeCss = 0;
    let bold = false;
    let italic = false;
    for (const item of group.items) {
      const e = item.transform[4] as number;
      const f = item.transform[5] as number;
      const size = Math.hypot((item.transform[2] as number) || 0, (item.transform[3] as number) || 0);
      fontSizeCss = Math.max(fontSizeCss, size);
      x0 = Math.min(x0, e);
      x1 = Math.max(x1, e + item.width);
      top = Math.min(top, f - item.height);
      bottom = Math.max(bottom, f + item.height * 0.2);
      const s = styleOf(item.fontName);
      bold = bold || s.bold;
      italic = italic || s.italic;
    }
    if (!isFinite(x0) || !isFinite(top) || x1 <= x0 || bottom <= top) continue;
    // Convert all four corners so rotated pages still get a correct box.
    const corners = [
      viewport.convertToPdfPoint(x0, top),
      viewport.convertToPdfPoint(x1, top),
      viewport.convertToPdfPoint(x0, bottom),
      viewport.convertToPdfPoint(x1, bottom),
    ];
    const pdfXs = corners.map((c) => c[0] as number);
    const pdfYs = corners.map((c) => c[1] as number);
    const pdfX = Math.min(...pdfXs);
    const pdfRight = Math.max(...pdfXs);
    const pdfTop = Math.max(...pdfYs);
    const pdfBottom = Math.min(...pdfYs);
    const baseline = viewport.convertToPdfPoint(x0, first.transform[5] as number);
    lines.push({
      id: `${pageIndex}:${lineIndex}`,
      pageIndex,
      text: group.text,
      x: x0,
      y: top,
      width: x1 - x0,
      height: bottom - top,
      fontSize: fontSizeCss,
      pdfX,
      pdfBaselineY: baseline[1] as number,
      pdfWidth: pdfRight - pdfX,
      pdfTop,
      pdfBottom,
      pdfFontSize: fontSizeCss / scale,
      bold,
      italic,
    });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Content-stream surgery: remove the original text so it no longer shows
// up in text search. Best-effort only — anything unrecognised is left
// alone and the white cover rectangle (drawn below) handles the visuals.
// ---------------------------------------------------------------------------

function decodeLiteral(inner: string): string {
  let out = "";
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = inner[i + 1];
    if (next === undefined) break;
    if (next >= "0" && next <= "7") {
      let oct = "";
      for (let j = 1; j <= 3 && i + j < inner.length; j++) {
        const c = inner[i + j];
        if (c >= "0" && c <= "7") oct += c;
        else break;
      }
      out += String.fromCharCode(parseInt(oct, 8));
      i += oct.length;
    } else if (next === "n") {
      out += "\n";
      i++;
    } else if (next === "r") {
      out += "\r";
      i++;
    } else if (next === "t") {
      out += "\t";
      i++;
    } else if (next === "b") {
      out += "\b";
      i++;
    } else if (next === "f") {
      out += "\f";
      i++;
    } else {
      out += next;
      i++;
    }
  }
  return out;
}

function decodeHex(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

type ShownOp = { start: number; end: number; text: string };

/** Find every text-showing operator in a content stream, with its text. */
function findShownOps(content: string): ShownOp[] {
  const ops: ShownOp[] = [];
  // Literal Tj | hex Tj | TJ array | literal ' (next-line show).
  const re =
    /\(((?:\\.|[^\\()])*)\)\s*Tj|<([0-9a-fA-F\s]+)>\s*Tj|\[((?:\((?:\\.|[^\\()])*\)|<[^>]*>|-?\d+(?:\.\d+)?\s*)*)\]\s*TJ|\(((?:\\.|[^\\()])*)\)\s*'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1] !== undefined) {
      ops.push({ start: m.index, end: m.index + m[0].length, text: decodeLiteral(m[1]) });
    } else if (m[2] !== undefined) {
      ops.push({ start: m.index, end: m.index + m[0].length, text: decodeHex(m[2]) });
    } else if (m[3] !== undefined) {
      // TJ array: concatenate its literal/hex strings, ignore kern numbers.
      const inner = m[3];
      let text = "";
      const lit = inner.match(/\(((?:\\.|[^\\()])*)\)/g) || [];
      for (const l of lit) text += decodeLiteral(l.slice(1, -1));
      const hexes = inner.match(/<([0-9a-fA-F\s]+)>/g) || [];
      for (const h of hexes) text += decodeHex(h.slice(1, -1));
      ops.push({ start: m.index, end: m.index + m[0].length, text });
    } else if (m[4] !== undefined) {
      ops.push({ start: m.index, end: m.index + m[0].length, text: decodeLiteral(m[4]) });
    }
  }
  return ops;
}

/**
 * Remove `target` text from a content stream. Returns the new stream and
 * whether anything was removed. Only removes operators whose text is
 * exactly the target (whole BT block, or a run of operators inside a
 * block) — neighbouring text is never touched.
 */
export function removeTextFromContent(content: string, target: string): { content: string; removed: boolean } {
  const want = norm(target);
  if (!want) return { content, removed: false };
  const ops = findShownOps(content);
  if (!ops.length) return { content, removed: false };
  // Whole-block match first: find BT...ET ranges.
  const blocks: { start: number; end: number }[] = [];
  const blockRe = /BT\b[\s\S]*?\bET\b/g;
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(content)) !== null) {
    blocks.push({ start: bm.index, end: bm.index + bm[0].length });
  }
  const cut: { start: number; end: number }[] = [];
  for (const block of blocks) {
    const inBlock = ops.filter((o) => o.start >= block.start && o.end <= block.end);
    if (!inBlock.length) continue;
    if (norm(inBlock.map((o) => o.text).join("")) === want) {
      cut.push(block);
      continue;
    }
    // Run match inside the block: a run of operators whose joined text
    // is exactly the target.
    for (let i = 0; i < inBlock.length; i++) {
      let joined = "";
      for (let j = i; j < inBlock.length; j++) {
        joined += inBlock[j].text;
        if (norm(joined) === want) {
          cut.push({ start: inBlock[i].start, end: inBlock[j].end });
          i = j;
          break;
        }
        if (norm(joined).length > want.length + 1) break;
      }
    }
  }
  if (!cut.length) return { content, removed: false };
  cut.sort((a, b) => b.start - a.start);
  let out = content;
  for (const c of cut) out = out.slice(0, c.start) + out.slice(c.end);
  return { content: out, removed: true };
}

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}

function toBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

async function loadPdfLib() {
  return import("pdf-lib");
}

/**
 * Apply text edits to a PDF. For each edited line the original text is
 * removed from the content stream where it can be matched (see above);
 * the line is always covered with a white rectangle and the new text is
 * drawn at the same position and size in a standard font.
 */
export async function applyTextEdits(bytes: Uint8Array, edits: TextEdit[]): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await loadPdfLib();
  const doc = await PDFDocument.load(bytes);
  const fonts = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();
  const getFont = async (bold: boolean, italic: boolean) => {
    const key = `${bold ? "b" : ""}${italic ? "i" : ""}` || "r";
    let font = fonts.get(key);
    if (!font) {
      const which = bold && italic
        ? StandardFonts.HelveticaBoldOblique
        : bold
          ? StandardFonts.HelveticaBold
          : italic
            ? StandardFonts.HelveticaOblique
            : StandardFonts.Helvetica;
      font = await doc.embedFont(which);
      fonts.set(key, font);
    }
    return font;
  };
  const byPage = new Map<number, TextEdit[]>();
  for (const e of edits) {
    const list = byPage.get(e.pageIndex) ?? [];
    list.push(e);
    byPage.set(e.pageIndex, list);
  }
  for (const [pageIndex, pageEdits] of byPage) {
    const page = doc.getPage(pageIndex);
    // 1) Content-stream surgery (best-effort, never fatal).
    try {
      const node = page.node;
      const contents = node.Contents();
      const refs: PDFRef[] = [];
      if (contents instanceof PDFRef) refs.push(contents);
      else if (contents instanceof PDFArray) {
        for (let i = 0; i < contents.size(); i++) {
          const r = contents.get(i);
          if (r instanceof PDFRef) refs.push(r);
        }
      }
      if (refs.length) {
        let full = "";
        for (const ref of refs) {
          const stream = doc.context.lookup(ref);
          if (!(stream instanceof PDFRawStream)) continue;
          full += latin1(decodePDFRawStream(stream).decode());
        }
        let changed = false;
        for (const e of pageEdits) {
          if (!e.originalText.trim()) continue;
          const r = removeTextFromContent(full, e.originalText);
          if (r.removed) {
            full = r.content;
            changed = true;
          }
        }
        if (changed) {
          const newRef = doc.context.flateStream(toBytes(full));
          node.set(PDFName.of("Contents"), newRef);
        }
      }
    } catch {
      // Surgery failed: the white cover below still fixes the visuals.
    }
    // 2) Cover + redraw every edited line.
    for (const e of pageEdits) {
      const font = await getFont(e.bold, e.italic);
      page.drawRectangle({
        x: e.pdfX - 1,
        y: e.pdfBottom - 1,
        width: e.pdfWidth + 2,
        height: e.pdfTop - e.pdfBottom + 2,
        color: rgb(1, 1, 1),
      });
      if (!e.newText.trim()) continue;
      let size = e.pdfFontSize;
      const w = font.widthOfTextAtSize(e.newText, size);
      if (w > e.pdfWidth && w > 0) size = Math.max(6, (size * e.pdfWidth) / w);
      page.drawText(e.newText, {
        x: e.pdfX,
        y: e.pdfBaselineY,
        size,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }
  return doc.save({ useObjectStreams: true });
}
