// Security primitives (pure, unit-tested). Never store raw IPs or raw TOTP
// secrets: IPs are SHA-256 hashed with a salt from TOTP_ENCRYPTION_KEY,
// TOTP secrets are AES-256-GCM encrypted with a key derived from it.
// TOTP_ENCRYPTION_KEY replaces the old Auth.js AUTH_SECRET for this purpose.
// Legacy AUTH_SECRET is still accepted as a fallback so TOTP secrets
// encrypted before the Supabase switch keep decrypting if the owner reuses
// the old value under the new name; new deployments set only
// TOTP_ENCRYPTION_KEY (server-only, never NEXT_PUBLIC_, never committed).
import crypto from "node:crypto";

function keySecret(): string {
  return process.env.TOTP_ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? "";
}

export function hashIp(ip: string, salt?: string): string {
  const s = salt ?? (keySecret() || "unconfigured");
  return crypto.createHash("sha256").update(`${s}:${ip}`).digest("hex");
}

function totpKey(): Buffer {
  const secret = keySecret();
  return crypto.createHash("sha256").update(`pth-totp:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", totpKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", totpKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// RFC 6238 TOTP (SHA-1, 30s step, 6 digits). Window of +-1 step tolerated.
export function totpCode(secret: string, atMs: number = Date.now()): string {
  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, atMs: number = Date.now()): boolean {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  for (const step of [-1, 0, 1]) {
    if (totpCode(secret, atMs + step * 30_000) === clean) return true;
  }
  return false;
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function totpAuthUrl(secret: string, account: string): string {
  return `otpauth://totp/${encodeURIComponent("PDF Tools Hub")}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent("PDF Tools Hub")}&algorithm=SHA1&digits=6&period=30`;
}
