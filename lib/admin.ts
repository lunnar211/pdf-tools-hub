// Admin helpers: role checks + audit logging. Enforced in proxy AND in every
// API route (defense in depth). Roles: SUPER (everything), SUPPORT (read
// users, notes, support inbox, view logs; NO plan changes, NO deletes, NO
// money edits, NO settings), FINANCE (view-only money + expenses view; NO
// edits, NO users, NO settings).
// Identity comes from Supabase Auth; role/adminRole come from the Prisma
// User row; the TOTP second step comes from the signed pth-totp cookie
// (lib/totp-session.ts). All three are checked SERVER-side here, on every
// admin page and API route — never client-side.
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { hashIp } from "./security";
import { getCurrentUser } from "./supabase/server";
import { parseTotpVerifiedAt, TOTP_COOKIE_NAME } from "./totp-session";

export type AdminRoleName = "SUPER" | "SUPPORT" | "FINANCE";

export type AdminSession = {
  userId: string;
  email: string;
  role: string;
  adminRole: AdminRoleName | null;
  totpVerifiedAt: string | null;
};

export async function getAdminSession(): Promise<AdminSession | null> {
  const { supabaseUser, dbUser } = await getCurrentUser();
  if (!supabaseUser || !dbUser || dbUser.role !== "ADMIN" || !dbUser.adminRole) return null;
  let totpVerifiedAt: string | null = null;
  try {
    totpVerifiedAt = parseTotpVerifiedAt((await cookies()).get(TOTP_COOKIE_NAME)?.value);
  } catch {
    totpVerifiedAt = null;
  }
  return {
    userId: dbUser.id,
    email: dbUser.email,
    role: "ADMIN",
    adminRole: dbUser.adminRole as AdminRoleName,
    totpVerifiedAt,
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
