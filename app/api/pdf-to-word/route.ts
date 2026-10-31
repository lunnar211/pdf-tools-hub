import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { z } from "zod";
import { validateUpload, fileResponse, errorResponse, outputName, MAX_PDF_BYTES } from "@/lib/files";
import { getFiles, genericError } from "@/lib/api-helpers";
import { toolGate } from "@/lib/tool-gate";
import { recordCurrentUserJob } from "@/lib/jobs";

export const runtime = "nodejs";

const schema = z.object({ file: z.instanceof(File) });

export async function POST(req: Request) {
  try {
    const blocked = await toolGate(req, "pdf-to-word");
    if (blocked) return blocked;
    const { files, error } = await getFiles(req, "file");
    if (error) return error;
    const file = files[0];
    schema.parse({ file });
    const buf = Buffer.from(await file.arrayBuffer());
    const bad = validateUpload(buf, file.type, ["pdf"], MAX_PDF_BYTES);
    if (bad) return errorResponse(bad, 400);
    // pdfjs-dist v6 in a Next server bundle: the fake worker tries to
    // dynamically import "./pdf.worker.mjs" relative to the bundled chunk,
    // which does not exist. Importing the worker module directly and
    // registering it on globalThis makes pdf.js use it in-process instead.
    const workerMod = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
    (globalThis as unknown as { pdfjsWorker?: unknown }).pdfjsWorker = workerMod;
    const loading = pdfjs.getDocument({ data: new Uint8Array(buf) });
    const pdf = await loading.promise;
    const children: Paragraph[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      // Group items into lines; font size (transform[3]) approximates headings.
      const lines: { text: string; size: number }[] = [];
      let cur = ""; let curSize = 0;
      for (const item of tc.items) {
        if (!("str" in item)) continue;
        const size = Math.abs(item.transform[3] || 0);
        if (size) curSize = Math.max(curSize, size);
        cur += item.str;
        if ((item as { hasEOL?: boolean }).hasEOL) {
          if (cur.trim()) lines.push({ text: cur.trim(), size: curSize || 11 });
          cur = ""; curSize = 0;
        }
      }
      if (cur.trim()) lines.push({ text: cur.trim(), size: curSize || 11 });
      if (p > 1) children.push(new Paragraph({ text: "" }));
      for (const line of lines) {
        const heading = line.size >= 18 ? HeadingLevel.HEADING_1 : line.size >= 14 ? HeadingLevel.HEADING_2 : undefined;
        children.push(new Paragraph({ heading, children: [new TextRun(line.text)] }));
      }
    }
    const doc = new Document({ sections: [{ children }] });
    const out = await Packer.toBuffer(doc);
    await recordCurrentUserJob("pdf-to-word", "SUCCESS");
    return fileResponse(new Uint8Array(out), outputName(file.name, "-converted", "docx"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  } catch (err) {
    console.error("PDF_TO_WORD_ERROR", err);
    await recordCurrentUserJob("pdf-to-word", "FAILED");
    return genericError();
  }
}
