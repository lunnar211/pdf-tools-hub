// Admin TOTP second-step session, carried as a signed httpOnly cookie.
// WHY A COOKIE (and why custom TOTP is kept): Supabase Auth has no notion of
// this site's admin 2FA step, and Supabase's built-in MFA would add a second
// authenticator enrolment (MFA factors on the Auth user) plus a separate
// challenge flow for a step that only admins ever take. The existing custom
// TOTP (RFC 6238, secret AES-256-GCM-encrypted in the Prisma User row) is
// already built, tested, and understood, so it is kept: after a correct code,
// the server sets this cookie; every /admin page and API route re-checks it
// server-side via getAdminSession() (lib/admin.ts), and the proxy also checks
// it for a fast redirect. The cookie value is timestamp + HMAC-SHA256 over
// that timestamp, keyed by TOTP_ENCRYPTION_KEY (legacy AUTH_SECRET accepted
// as a fallback so existing encrypted TOTP secrets keep decrypting if the
// owner reuses the old value under the new name). A tampered or expired
// value verifies to null, never to a fresh timestamp.
import crypto from "node:crypto";

export const TOTP_COOKIE_NAME = "pth-totp";
export const TOTP_VALID_MS = 12 * 60 * 60 * 1000;

function totpSessionKey(): Buffer {
  const secret = process.env.TOTP_ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? "";
  return crypto.createHash("sha256").update(`pth-totp-session:${secret}`).digest();
}

export function createTotpCookieValue(atMs: number = Date.now()): string {
  const ts = String(atMs);
  const sig = crypto.createHmac("sha256", totpSessionKey()).update(ts).digest("hex");
  return `${ts}.${sig}`;
}

export function parseTotpVerifiedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const [ts, sig] = value.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts)) return null;
  const expected = crypto.createHmac("sha256", totpSessionKey()).update(ts).digest("hex");
  try {
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  const ms = Number(ts);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

export function totpCookieFresh(value: string | null | undefined): boolean {
  const at = parseTotpVerifiedAt(value);
  if (!at) return false;
  const ms = new Date(at).getTime();
  return Number.isFinite(ms) && Date.now() - ms < TOTP_VALID_MS;
}
