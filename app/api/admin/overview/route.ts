import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Admin overview numbers for API consumers. Every admin API route re-checks
// the session + role; the proxy redirect alone is never trusted.
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return Response.json({ error: "Forbidden." }, { status: 403 });
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  const [totalUsers, failedJobs, errors] = await Promise.all([
    prisma.user.count(),
    prisma.job.count({ where: { status: "FAILED" } }),
    prisma.errorLog.count(),
  ]);
  return Response.json({ totalUsers, failedJobs, errors, role: admin.adminRole });
}
