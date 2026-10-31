import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { validateUpload, fileResponse, errorResponse, MAX_PDF_BYTES } from "@/lib/files";
import { getFiles, rateLimitGuard, genericError } from "@/lib/api-helpers";

export const runtime = "nodejs";
const schema = z.object({ file: z.instanceof(File) });

export async function POST(req: Request) {
  try {
    const blocked = await rateLimitGuard(req);
    if (blocked) return blocked;
    const { files, error } = await getFiles(req, "file");
    if (error) return error;
    const file = files[0];
    schema.parse({ file });
    const buf = Buffer.from(await file.arrayBuffer());
    const bad = validateUpload(buf, file.type, ["pdf"], MAX_PDF_BYTES);
    if (bad) return errorResponse(bad, 400);
    const doc = await PDFDocument.load(new Uint8Array(buf));
    const out = await doc.save({ useObjectStreams: true });
    const res = fileResponse(out, file.name.replace(/\.pdf$/i, "") + "-compressed.pdf", "application/pdf");
    res.headers.set("X-Input-Bytes", String(buf.length));
    res.headers.set("X-Output-Bytes", String(out.length));
    return res;
  } catch {
    return genericError();
  }
}
