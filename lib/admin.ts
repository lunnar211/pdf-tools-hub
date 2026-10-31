// Admin helpers: role checks + audit logging. Enforced in proxy AND in every
// API route (defense in depth). Roles: SUPER (everything), SUPPORT (read
// users, notes, support inbox, view logs; NO plan changes, NO deletes, NO
// money edits, NO settings), FINANCE (view-only money + expenses view; NO
// edits, NO users, NO settings).
import { prisma } from "./prisma";
import { hashIp } from "./security";
import { auth } from "@/auth";

export type AdminRoleName = "SUPER" | "SUPPORT" | "FINANCE";

export type AdminSession = {
  userId: string;
  email: string;
  role: string;
  adminRole: AdminRoleName | null;
  totpVerifiedAt: string | null;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await auth();
  const u = session?.user as unknown as Record<string, unknown> | undefined;
  if (!u || u.role !== "ADMIN" || !u.adminRole) return null;
  return {
    userId: String(u.id ?? ""),
    email: String(u.email ?? ""),
    role: "ADMIN",
    adminRole: u.adminRole as AdminRoleName,
    totpVerifiedAt: (u.totpVerifiedAt as string | null) ?? null,
  };
}

export function totpFresh(totpVerifiedAt: string | null): boolean {
  if (!totpVerifiedAt) return false;
  const t = new Date(totpVerifiedAt).getTime();
  return Number.isFinite(t) && Date.now() - t < 12 * 60 * 60 * 1000;
}

export function canManageUsers(role: AdminRoleName | null): boolean {
  return role === "SUPER";
}

export function canEditMoney(role: AdminRoleName | null): boolean {
  return role === "SUPER";
}

export function canEditSettings(role: AdminRoleName | null): boolean {
  return role === "SUPER";
}

export function canViewUsers(role: AdminRoleName | null): boolean {
  return role === "SUPER" || role === "SUPPORT";
}

export function canViewMoney(role: AdminRoleName | null): boolean {
  return role === "SUPER" || role === "FINANCE";
}

export async function audit(
  actorId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  ip?: string | null,
): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        ipHash: ip ? hashIp(ip) : null,
      },
    });
  } catch {
    // Audit failure must not break the admin action itself.
  }
}

export async function logError(source: string, message: string, path?: string): Promise<void> {
  if (!prisma) return;
  try {
    await prisma.errorLog.create({ data: { source, message: message.slice(0, 500), path: path ?? null } });
  } catch {
    // ignore
  }
}

export { adminEmails } from "./security";
