// Next.js 16 proxy (the renamed middleware convention), Node.js runtime.
// Supabase Auth edition — replaces the old Auth.js JWT decoding.
// Rules (optimistic first gate ONLY; full authorization is re-checked
// server-side in every layout, page, and API route — see lib/admin.ts):
// - /admin/* (except /admin/verify-2fa and /admin/setup-2fa): requires a
//   Supabase session; without one -> /signin. With a session but no fresh
//   TOTP cookie -> /admin/verify-2fa (role itself is checked by the layout).
// - /account, /onboarding: require a Supabase session; otherwise -> /signin.
//   Age/suspension/role gates live in the pages, not here.
// - Everything else passes through; tools work for guests.
// The proxy NEVER imports Prisma or any DB code: it reads the Supabase
// session from cookies and the signed TOTP cookie only. When Supabase env
// vars are unset there can be no session, so guarded paths redirect to
// /signin, which shows the honest "not configured" state.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { totpCookieFresh, TOTP_COOKIE_NAME } from "./lib/totp-session";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding");
  if (!isAdmin && !isAccount && !isOnboarding) return NextResponse.next();

  let response = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const signin = new URL("/signin", req.url);
  if (!url || !key) return NextResponse.redirect(signin);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          response = NextResponse.next({ request: req });
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    user = null;
  }
  if (!user) return NextResponse.redirect(signin);

  if (isAdmin) {
    if (pathname === "/admin/verify-2fa" || pathname === "/admin/setup-2fa") {
      return response;
    }
    // Fast TOTP gate; the admin layout re-checks role + TOTP server-side,
    // so a non-admin with a stray cookie still never sees an admin page.
    if (!totpCookieFresh(req.cookies.get(TOTP_COOKIE_NAME)?.value)) {
      return NextResponse.redirect(new URL("/admin/verify-2fa", req.url));
    }
    return response;
  }
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*", "/onboarding", "/onboarding/:path*"],
};
