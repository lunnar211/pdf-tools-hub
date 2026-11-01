// Safe post-login redirect validation (pure, unit-tested).
// Only same-site relative paths are ever accepted. Anything else — absolute
// URLs, protocol-relative URLs, backslash tricks, control characters — falls
// back to the default. This is the single place that decides where the
// /auth/callback route and the sign-in page may send a user after login,
// so an attacker link like /auth/callback?next=https://evil.example can
// never turn this site into an open-redirect hop.
export const DEFAULT_POST_LOGIN_PATH = "/account";

export function validateNext(raw: string | null | undefined, fallback: string = DEFAULT_POST_LOGIN_PATH): string {
  if (!raw) return fallback;
  // Reject control characters outright (header-injection / log tricks).
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("://")) return fallback;
  // A bare "/" is fine; anything else must be a plain relative path.
  return raw;
}
