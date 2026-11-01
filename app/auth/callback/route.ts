// Supabase OAuth callback: exchanges the ?code= for a session, upserts the
// Prisma User row (by supabaseId, then email), and redirects to a VALIDATED
// `next` path. The `next` value is never trusted raw: validateNext() only
// allows same-site relative paths, so ?next=https://evil.example (or
// //evil.example) can never redirect a user off-site. On any failure the
// user lands back on /signin with a generic error, never on the attacker URL.
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { validateNext, DEFAULT_POST_LOGIN_PATH } from "@/lib/redirect";
import { ensureDbUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const code = reqUrl.searchParams.get("code");
  const next = validateNext(reqUrl.searchParams.get("next"), DEFAULT_POST_LOGIN_PATH);
  const origin = reqUrl.origin;
  const signin = new URL("/signin", origin);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !code) {
    signin.searchParams.set("error", "signin_failed");
    return NextResponse.redirect(signin);
  }
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Route handlers can set cookies; this catch is belt-and-braces.
        }
      },
    },
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    signin.searchParams.set("error", "signin_failed");
    return NextResponse.redirect(signin);
  }
  // First-login upsert: map the Supabase Auth user to its Prisma row.
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      const dbUser = await ensureDbUser(data.user);
      if (dbUser && prisma) {
        await prisma.user.update({ where: { id: dbUser.id }, data: { lastLoginAt: new Date() } }).catch(() => null);
      }
    }
  } catch {
    // A DB hiccup here must not break sign-in: getCurrentUser() lazily
    // upserts on the next request. The session itself is already valid.
  }
  return NextResponse.redirect(new URL(next, origin));
}
