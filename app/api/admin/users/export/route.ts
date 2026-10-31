import { getAdminSession, canViewUsers } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !canViewUsers(admin.adminRole)) return Response.json({ error: "Forbidden." }, { status: 403 });
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    "email,name,plan,status,role,adminRole,country,createdAt",
    ...users.map((u) =>
      [u.email, u.name ?? "", u.plan, u.status, u.role, u.adminRole ?? "", u.country ?? "", u.createdAt.toISOString()].map(esc).join(","),
    ),
  ].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="users.csv"' } });
}
