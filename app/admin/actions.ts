"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminSession, audit, canManageUsers, canEditMoney, canEditSettings } from "@/lib/admin";
import { hashIp } from "@/lib/security";

async function requireDb() {
  if (!prisma) throw new Error("Database not configured.");
  return prisma;
}

function ok() {
  return { ok: true as const };
}

function fail(message: string) {
  return { ok: false as const, error: message };
}

export async function suspendUser(userId: string) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return fail("Not allowed.");
  const db = await requireDb();
  await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await audit(admin.userId, "user.suspend", "User", userId);
  revalidatePath("/admin/users");
  return ok();
}

export async function unsuspendUser(userId: string) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return fail("Not allowed.");
  const db = await requireDb();
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await audit(admin.userId, "user.unsuspend", "User", userId);
  revalidatePath("/admin/users");
  return ok();
}

export async function deleteUser(userId: string) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return fail("Not allowed.");
  if (userId === admin.userId) return fail("You cannot delete your own admin account from here.");
  const db = await requireDb();
  await db.auditLog.deleteMany({ where: { actorId: userId } });
  await db.user.delete({ where: { id: userId } });
  await audit(admin.userId, "user.delete", "User", userId);
  revalidatePath("/admin/users");
  return ok();
}

export async function changePlan(userId: string, plan: string) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return fail("Not allowed.");
  if (plan !== "FREE" && plan !== "PREMIUM") return fail("Invalid plan.");
  const db = await requireDb();
  await db.user.update({ where: { id: userId }, data: { plan: plan as "FREE" | "PREMIUM" } });
  await audit(admin.userId, "user.plan", "User", userId);
  revalidatePath("/admin/users");
  return ok();
}

export async function resetLimits(userId: string) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return fail("Not allowed.");
  const db = await requireDb();
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  await db.job.deleteMany({ where: { userId, createdAt: { gte: start } } });
  await audit(admin.userId, "user.reset-limits", "User", userId);
  revalidatePath("/admin/users");
  return ok();
}

export async function addNote(userId: string, formData: FormData) {
  const admin = await getAdminSession();
  if (!admin || (admin.adminRole !== "SUPER" && admin.adminRole !== "SUPPORT")) return void fail("Not allowed.");
  const note = String(formData.get("note") ?? "").trim().slice(0, 2000);
  if (!note) return void fail("Note is empty.");
  const db = await requireDb();
  await db.adminNote.create({ data: { userId, authorId: admin.userId, note } });
  await audit(admin.userId, "user.note", "User", userId);
  revalidatePath("/admin/users");
  return;
}

export async function blockIp(formData: FormData) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return void fail("Not allowed.");
  const ip = String(formData.get("ip") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200);
  if (!ip) return void fail("IP is required.");
  const db = await requireDb();
  await db.blockedIp.upsert({
    where: { ipHash: hashIp(ip) },
    create: { ipHash: hashIp(ip), reason: reason || null, blockedBy: admin.userId },
    update: { reason: reason || null, blockedBy: admin.userId },
  });
  await audit(admin.userId, "ip.block", "BlockedIp", hashIp(ip).slice(0, 12));
  revalidatePath("/admin/usage");
  return;
}

export async function unblockIp(id: string) {
  const admin = await getAdminSession();
  if (!admin || !canManageUsers(admin.adminRole)) return void fail("Not allowed.");
  const db = await requireDb();
  await db.blockedIp.delete({ where: { id } });
  await audit(admin.userId, "ip.unblock", "BlockedIp", id);
  revalidatePath("/admin/usage");
  return;
}

export async function saveSettings(formData: FormData) {
  const admin = await getAdminSession();
  if (!admin || !canEditSettings(admin.adminRole)) return void fail("Not allowed.");
  const db = await requireDb();
  const keys = [
    "guest_daily_limit", "free_daily_limit", "premium_daily_limit", "maintenance_mode",
    "announcement_banner", "ads_enabled", "api_budget_usd",
    "tool_pdf-to-word_enabled", "tool_word-to-pdf_enabled", "tool_image-to-pdf_enabled",
    "tool_merge-pdf_enabled", "tool_split-pdf_enabled", "tool_compress-pdf_enabled",
  ];
  for (const key of keys) {
    const raw = formData.get(key);
    if (raw === null) continue;
    const value = String(raw).trim();
    await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await audit(admin.userId, "settings.save", "SiteSetting", "all");
  revalidatePath("/admin/settings");
  return;
}

export async function addExpense(formData: FormData) {
  const admin = await getAdminSession();
  if (!admin || !canEditMoney(admin.adminRole)) return void fail("Not allowed.");
  const db = await requireDb();
  const category = String(formData.get("category") ?? "").trim().slice(0, 100);
  const vendor = String(formData.get("vendor") ?? "").trim().slice(0, 100);
  const amount = parseInt(String(formData.get("amount") ?? "0"), 10);
  const currency = String(formData.get("currency") ?? "USD").trim().slice(0, 10) || "USD";
  const dateRaw = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!category || !vendor || !Number.isFinite(amount) || amount < 0 || !dateRaw) return void fail("Fill in category, vendor, amount, and date.");
  await db.expense.create({
    data: { category, vendor, amount, currency, date: new Date(`${dateRaw}T00:00:00Z`), note: note || null, createdBy: admin.userId },
  });
  await audit(admin.userId, "expense.create", "Expense", vendor);
  revalidatePath("/admin/money");
  return;
}

export async function deleteExpense(id: string) {
  const admin = await getAdminSession();
  if (!admin || !canEditMoney(admin.adminRole)) return void fail("Not allowed.");
  const db = await requireDb();
  await db.expense.delete({ where: { id } });
  await audit(admin.userId, "expense.delete", "Expense", id);
  revalidatePath("/admin/money");
  return;
}

export async function replySupport(id: string, formData: FormData) {
  const admin = await getAdminSession();
  if (!admin || (admin.adminRole !== "SUPER" && admin.adminRole !== "SUPPORT")) return void fail("Not allowed.");
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 5000);
  if (!reply) return void fail("Reply is empty.");
  const db = await requireDb();
  await db.supportMessage.update({ where: { id }, data: { reply, repliedBy: admin.userId, status: "REPLIED" } });
  await audit(admin.userId, "support.reply", "SupportMessage", id);
  revalidatePath("/admin/support");
  return;
}

export async function closeSupport(id: string) {
  const admin = await getAdminSession();
  if (!admin || (admin.adminRole !== "SUPER" && admin.adminRole !== "SUPPORT")) return void fail("Not allowed.");
  const db = await requireDb();
  await db.supportMessage.update({ where: { id }, data: { status: "CLOSED" } });
  await audit(admin.userId, "support.close", "SupportMessage", id);
  revalidatePath("/admin/support");
  return;
}
