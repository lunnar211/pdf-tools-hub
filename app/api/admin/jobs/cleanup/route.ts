import { getAdminSession, audit, canManageUsers } from "@/lib/admin";
import { cleanupOldJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST: delete Job rows older than 90 days (documented retention policy).
// SUPER only; the count deleted is returned and audited.
export async function POST() {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return Response.json({ error: "Forbidden." }, { status: 403 });
  const deleted = await cleanupOldJobs();
  await audit(admin.userId, "jobs.cleanup", "Job", String(deleted));
  return Response.json({ ok: true, deleted });
}
