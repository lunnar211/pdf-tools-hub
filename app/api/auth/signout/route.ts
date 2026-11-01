// POST /api/auth/signout — server-side sign-out: clears the Supabase
// session cookies AND the admin TOTP cookie, so a signed-out browser keeps
// no admin second-step. The client also calls supabase.auth.signOut()
// (browser client) before hitting this route; either alone is incomplete
// for a clean logout, both together are complete.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TOTP_COOKIE_NAME } from "@/lib/totp-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut().catch(() => null);
  }
  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${TOTP_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  return res;
}
