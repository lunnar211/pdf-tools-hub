import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { validateUpload, fileResponse, errorResponse, outputName, MAX_PDF_BYTES } from "@/lib/files";
import { getFiles, rateLimitGuard, genericError } from "@/lib/api-helpers";

export const runtime = "nodejs";
const schema = z.object({ file: z.instanceof(File) });

type Block = { kind: "h1" | "h2" | "h3" | "p"; segments: { text: string; bold: boolean; italic: boolean }[] };

function parseHtml(html: string): Block[] {
  const blocks: Block[] = [];
  const re = /<(h1|h2|h3|p)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const kind = m[1] as Block["kind"];
    const inner = m[2].replace(/<br\s*\/?>/gi, " ");
    const segments: Block["segments"] = [];
    const segRe = /<(strong|b|em|i)>([\s\S]*?)<\/\1>|([^<]+)/gi;
    let s: RegExpExecArray | null;
    while ((s = segRe.exec(inner))) {
      const text = (s[2] ?? s[3] ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
      if (!text) continue;
      segments.push({ text, bold: s[1] === "strong" || s[1] === "b", italic: s[1] === "em" || s[1] === "i" });
    }
    if (segments.length) blocks.push({ kind, segments });
  }
  return blocks;
}

export async function POST(req: Request) {
  try {
    const blocked = await rateLimitGuard(req);
    if (blocked) return blocked;
    const { files, error } = await getFiles(req, "file");
    if (error) return error;
    const file = files[0];
    schema.parse({ file });
    const buf = Buffer.from(await file.arrayBuffer());
    const bad = validateUpload(buf, file.type, ["docx"], MAX_PDF_BYTES);
    if (bad) return errorResponse(bad, 400);
    const { value: html } = await mammoth.convertToHtml({ buffer: buf });
    const blocks = parseHtml(html);
    if (blocks.length === 0) return errorResponse("No readable text was found in this Word document.", 400);

    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
    const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
    const W = 595.28, H = 841.89, MARGIN = 50, MAXW = W - MARGIN * 2;
    let page = doc.addPage([W, H]);
    let y = H - MARGIN;
    const fontFor = (b: boolean, i: boolean) => (b && i ? boldItalic : b ? bold : i ? italic : regular);
    const sizeFor = (k: Block["kind"]) => (k === "h1" ? 20 : k === "h2" ? 16 : k === "h3" ? 13 : 11);
    const wrap = (text: string, font: ReturnType<typeof fontFor>, size: number): string[] => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = []; let line = "";
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, size) > MAXW && line) { lines.push(line); line = w; }
        else line = test;
      }
      if (line) lines.push(line);
      return lines;
    };
    for (const block of blocks) {
      const size = sizeFor(block.kind);
      const gap = block.kind === "p" ? 6 : 10;
      for (const seg of block.segments) {
        const font = fontFor(seg.bold, seg.italic);
        for (const line of wrap(seg.text, font, size)) {
          const lh = size * 1.4;
          if (y - lh < MARGIN) { page = doc.addPage([W, H]); y = H - MARGIN; }
          page.drawText(line, { x: MARGIN, y, size, font, color: rgb(0.09, 0.09, 0.09) });
          y -= lh;
        }
      }
      y -= gap;
      if (y < MARGIN) { page = doc.addPage([W, H]); y = H - MARGIN; }
    }
    const out = await doc.save();
    return fileResponse(out, outputName(file.name, "-converted", "pdf"), "application/pdf");
  } catch {
    return genericError();
  }
}
