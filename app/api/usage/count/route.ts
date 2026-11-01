// POST /api/usage/count { tool } — charge one conversion against the real
// limit system before a browser-side conversion runs. Runs the full tool
// gate (maintenance / tool-off / blocked IP / suspended / daily quota) and
// returns the gate's error response unchanged when blocked, so the client
// shows the same message the server tools show.
import { countUsage } from "@/lib/usage";
import { TOOLS, type ToolSlug } from "@/lib/site";
import { errorResponse } from "@/lib/files";

export const runtime = "nodejs";

const KNOWN_TOOLS = new Set(TOOLS.map((t) => t.slug));

export async function POST(req: Request) {
  let tool = "";
  try {
    tool = (await req.json())?.tool ?? "";
  } catch {
    return errorResponse("Invalid request.", 400);
  }
  if (typeof tool !== "string" || !KNOWN_TOOLS.has(tool as ToolSlug)) {
    return errorResponse("Unknown tool.", 400);
  }
  const { blocked, info } = await countUsage(req, tool as ToolSlug);
  if (blocked) return blocked;
  return Response.json({ ok: true, ...info }, { headers: { "Cache-Control": "no-store" } });
}
