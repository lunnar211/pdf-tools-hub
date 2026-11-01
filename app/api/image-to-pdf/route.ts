import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { validateUpload, fileResponse, errorResponse, MAX_IMAGE_BYTES, MAX_IMAGES } from "@/lib/files";
import { getFiles, genericError } from "@/lib/api-helpers";
import { toolGate } from "@/lib/tool-gate";
import { recordCurrentUserJob } from "@/lib/jobs";
import { logError } from "@/lib/admin";

export const runtime = "nodejs";
const schema = z.object({ files: z.array(z.instanceof(File)).min(1).max(MAX_IMAGES) });

export async function POST(req: Request) {
  try {
    const blocked = await toolGate(req, "image-to-pdf");
    if (blocked) return blocked;
    const { files, error } = await getFiles(req, "files");
    if (error) return error;
    schema.parse({ files });
    const doc = await PDFDocument.create();
    const A4W = 595.28, A4H = 841.89;
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const bad = validateUpload(buf, file.type, ["png", "jpg"], MAX_IMAGE_BYTES);
      if (bad) return errorResponse(bad, 400);
      const kind = buf[0] === 0x89 ? "png" : "jpg";
      const img = kind === "png" ? await doc.embedPng(new Uint8Array(buf)) : await doc.embedJpg(new Uint8Array(buf));
      const page = doc.addPage([A4W, A4H]);
      const scale = Math.min(A4W / img.width, A4H / img.height);
      const w = img.width * scale, h = img.height * scale;
      page.drawImage(img, { x: (A4W - w) / 2, y: (A4H - h) / 2, width: w, height: h });
    }
    const out = await doc.save();
    await recordCurrentUserJob("image-to-pdf", "SUCCESS");
    return fileResponse(out, "images-to-pdf.pdf", "application/pdf");
  } catch (err) {
    void logError("image-to-pdf", err instanceof Error ? err.message : "unknown error");
    await recordCurrentUserJob("image-to-pdf", "FAILED");
    return genericError();
  }
}
