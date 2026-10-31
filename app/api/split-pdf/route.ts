import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { z } from "zod";
import { validateUpload, fileResponse, errorResponse, parseRanges, rangeSchema, MAX_PDF_BYTES } from "@/lib/files";
import { getFiles, rateLimitGuard, genericError } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const blocked = await rateLimitGuard(req);
    if (blocked) return blocked;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return errorResponse("No file was uploaded.", 400);
    const parsed = z.object({ ranges: rangeSchema }).safeParse({ ranges: form.get("ranges") });
    if (!parsed.success) return errorResponse("Page ranges must look like 1-3,5", 400);
    const buf = Buffer.from(await file.arrayBuffer());
    const bad = validateUpload(buf, file.type, ["pdf"], MAX_PDF_BYTES);
    if (bad) return errorResponse(bad, 400);
    const src = await PDFDocument.load(new Uint8Array(buf));
    const { ranges, error } = parseRanges(parsed.data.ranges, src.getPageCount());
    if (error) return errorResponse(error, 400);
    const zip = new JSZip();
    for (const [start, end] of ranges) {
      const part = await PDFDocument.create();
      const pages = await part.copyPages(src, Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i));
      pages.forEach((p) => part.addPage(p));
      zip.file(`pages-${start}-${end}.pdf`, await part.save());
    }
    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    return fileResponse(zipBytes, "split-pdfs.zip", "application/zip");
  } catch {
    return genericError();
  }
}
