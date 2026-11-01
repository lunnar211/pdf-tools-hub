// GET /api/account/me — minimal signed-in state for the navbar (Account vs
// Sign in, Admin link). Returns no profile data beyond role/plan flags, and
// never trusts a client-supplied id: identity always comes from the
// Supabase session cookie, resolved server-side.
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { supabaseUser, dbUser } = await getCurrentUser();
  if (!supabaseUser) return Response.json({ signedIn: false });
  return Response.json({
    signedIn: true,
    email: supabaseUser.email ?? null,
    isAdmin: dbUser?.role === "ADMIN",
    plan: dbUser?.plan ?? "FREE",
  });
}
