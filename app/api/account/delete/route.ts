import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Deletes ONLY the session user's own rows (user + jobs + subscriptions +
// payments + notes cascade; audit rows about them are removed too).
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Not signed in." }, { status: 401 });
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  return Response.json({ ok: true });
}
