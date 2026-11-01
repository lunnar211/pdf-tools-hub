// GET /api/usage/remaining — real remaining conversions for the counter.
// Never consumes quota. No auth required: guests get the per-IP limit,
// signed-in users get their plan quota.
import { peekUsage } from "@/lib/usage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const info = await peekUsage(req);
  return Response.json(info, { headers: { "Cache-Control": "no-store" } });
}
