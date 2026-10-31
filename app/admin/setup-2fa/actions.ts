"use server";
import QRCode from "qrcode";
import { auth, updateSessionFlags } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, encryptSecret, decryptSecret, verifyTotp, totpAuthUrl } from "@/lib/security";
import { getAdminSession } from "@/lib/admin";

export async function startTotpSetup(): Promise<{ ok: boolean; qr?: string; url?: string; error?: string }> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Not signed in as admin." };
  if (!prisma) return { ok: false, error: "Database not configured." };
  const secret = generateTotpSecret();
  const url = totpAuthUrl(secret, admin.email);
  await prisma.user.update({
    where: { id: admin.userId },
    data: { totpSecretEncrypted: encryptSecret(secret), totpEnabled: false },
  });
  const qr = await QRCode.toDataURL(url);
  return { ok: true, qr, url };
}

export async function verifyTotpSetup(code: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Not signed in as admin." };
  if (!prisma) return { ok: false, error: "Database not configured." };
  const user = await prisma.user.findUnique({ where: { id: admin.userId } });
  if (!user?.totpSecretEncrypted) return { ok: false, error: "No setup in progress. Generate a code first." };
  let secret: string;
  try {
    secret = decryptSecret(user.totpSecretEncrypted);
  } catch {
    return { ok: false, error: "Stored secret could not be read. Generate a new one." };
  }
  if (!verifyTotp(secret, code)) return { ok: false, error: "That code did not match. Check your authenticator app and try again." };
  await prisma.user.update({ where: { id: admin.userId }, data: { totpEnabled: true } });
  await updateSessionFlags({ totpVerifiedAt: new Date().toISOString() });
  return { ok: true };
}

export async function verifyTotpChallenge(code: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  const admin = await getAdminSession();
  if (!admin || !session) return { ok: false, error: "Not signed in as admin." };
  if (!prisma) return { ok: false, error: "Database not configured." };
  const user = await prisma.user.findUnique({ where: { id: admin.userId } });
  if (!user?.totpEnabled || !user.totpSecretEncrypted) return { ok: false, error: "Two-factor setup is not finished. Go to 2FA setup first." };
  let secret: string;
  try {
    secret = decryptSecret(user.totpSecretEncrypted);
  } catch {
    return { ok: false, error: "Stored secret could not be read." };
  }
  if (!verifyTotp(secret, code)) return { ok: false, error: "That code did not match." };
  await updateSessionFlags({ totpVerifiedAt: new Date().toISOString() });
  return { ok: true };
}
