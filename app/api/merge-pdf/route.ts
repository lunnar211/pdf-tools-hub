import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { validateUpload, fileResponse, errorResponse, MAX_PDF_BYTES } from "@/lib/files";
import { getFiles, genericError } from "@/lib/api-helpers";
import { toolGate } from "@/lib/tool-gate";
import { recordCurrentUserJob } from "@/lib/jobs";

export const runtime = "nodejs";
const schema = z.object({ files: z.array(z.instanceof(File)).min(2).max(20) });

export async function POST(req: Request) {
  try {
    const blocked = await toolGate(req, "merge-pdf");
    if (blocked) return blocked;
    const { files, error } = await getFiles(req, "files");
    if (error) return error;
    schema.parse({ files });
    const out = await PDFDocument.create();
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const bad = validateUpload(buf, file.type, ["pdf"], MAX_PDF_BYTES);
      if (bad) return errorResponse(bad, 400);
      const src = await PDFDocument.load(new Uint8Array(buf));
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    const bytes = await out.save();
    await recordCurrentUserJob("merge-pdf", "SUCCESS");
    return fileResponse(bytes, "merged.pdf", "application/pdf");
  } catch {
    await recordCurrentUserJob("merge-pdf", "FAILED");
    return genericError();
  }
}
