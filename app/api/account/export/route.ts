import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GDPR/CCPA-style export: the user's own rows only (IDOR-safe: the query is
// always scoped to the session's Supabase user id, never to a
// client-supplied id).
export async function GET() {
  const { supabaseUser, dbUser: user } = await getCurrentUser();
  if (!supabaseUser) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  const [jobs, subscriptions, payments, notes] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.subscription.findMany({ where: { userId: user.id } }),
    prisma.payment.findMany({ where: { userId: user.id } }),
    prisma.adminNote.findMany({ where: { userId: user.id } }),
  ]);
  const { totpSecretEncrypted, ...safeUser } = user;
  void totpSecretEncrypted;
  return Response.json(
    { exportedAt: new Date().toISOString(), user: safeUser, jobs, subscriptions, payments, notes },
    { headers: { "Content-Disposition": 'attachment; filename="pdf-tools-hub-my-data.json"' } },
  );
}
