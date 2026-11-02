// Auth callback URL construction for Supabase OAuth sign-in. The Google
// button passes redirectTo = this site's own origin + /auth/callback, and
// the `next` value inside it is re-validated here (it was already
// validated server-side on the sign-in page, and /auth/callback validates
// it a third time before redirecting). Defense in depth: even a hostile
// `next` can never turn this URL into an off-site redirect, because
// validateNext() falls back to /account for anything that is not a plain
// same-site relative path. The origin itself always comes from
// window.location.origin in the browser, i.e. this site — never from user
// input, never from an env var, never from Supabase's Site URL setting.
import { validateNext } from "@/lib/redirect";

export function buildAuthCallbackUrl(origin: string, next: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/auth/callback?next=${encodeURIComponent(validateNext(next))}`;
}
