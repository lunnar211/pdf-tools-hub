import { getAdminSession, canViewMoney } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin || !canViewMoney(admin.adminRole)) return Response.json({ error: "Forbidden." }, { status: 403 });
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 1000 }),
    prisma.expense.findMany({ orderBy: { date: "desc" }, take: 1000 }),
  ]);
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = ["type,id,amount,currency,status,createdAt"];
  for (const p of payments) lines.push(["payment", p.transactionId, String(p.amount), p.currency, p.status, p.createdAt.toISOString()].map(esc).join(","));
  for (const e of expenses) lines.push(["expense", e.id, String(e.amount), e.currency, e.category, e.date.toISOString()].map(esc).join(","));
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="money.csv"' } });
}
