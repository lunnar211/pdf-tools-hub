import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Deletes ONLY the session user's own rows (user + jobs + subscriptions +
// payments + notes cascade; audit rows about them are removed too).
// HONEST LIMIT: this deletes the Prisma profile, not the Supabase Auth
// identity — deleting an Auth user needs the service-role key (Admin API)
// or a dashboard deletion, and the anon key cannot do it. No service-role
// key is introduced (see COMPLIANCE_CHECKLIST.md): the response flags
// supabaseIdentityRetained so the UI/support path can say so plainly, and
// the client signs the user out immediately after a successful delete.
export async function POST() {
  const { supabaseUser, dbUser: user } = await getCurrentUser();
  if (!supabaseUser) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  return Response.json({ ok: true, supabaseIdentityRetained: true });
}
