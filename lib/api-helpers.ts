import { checkRateLimit, getClientIp, FREE_DAILY_LIMIT } from "./rate-limit";
import { errorResponse } from "./files";

export async function rateLimitGuard(req: Request): Promise<Response | null> {
  const ip = getClientIp(req);
  const res = await checkRateLimit(ip);
  if (!res.allowed) {
    return errorResponse(
      `Free daily limit reached (${FREE_DAILY_LIMIT} conversions per day). Please try again tomorrow.`,
      429
    );
  }
  return null;
}

export async function getFiles(req: Request, field: string): Promise<{ files: File[]; error: Response | null }> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { files: [], error: errorResponse("Could not read the uploaded form.", 400) };
  }
  const files = form.getAll(field).filter((v): v is File => v instanceof File && v.size > 0);
  if (files.length === 0) return { files: [], error: errorResponse("No file was uploaded.", 400) };
  return { files, error: null };
}

export function genericError(): Response {
  return errorResponse("Conversion failed. Please check the file and try again.", 500);
}
