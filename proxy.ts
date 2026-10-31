// Next.js 16 proxy (the renamed middleware convention). Runs on the Node.js
// runtime; it is JWT-only and NEVER imports Prisma or any DB code, so admin
// and onboarding gates work with no DB round-trip.
// Rules:
// - /admin/* (except /admin/verify-2fa and /admin/setup-2fa): requires a
//   session + role ADMIN + adminRole + totpVerifiedAt within the last 12h.
//   Missing session -> /signin; admin without fresh TOTP -> /admin/verify-2fa;
//   non-admin -> / (never an admin page).
// - /account, /onboarding: require a session; signed-in users without
//   ageConfirmed are sent to /onboarding (except /onboarding itself).
// - Everything else passes through; tools work for guests.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "@auth/core/jwt";

const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];

type TokenPayload = {
  role?: string;
  adminRole?: string | null;
  totpVerifiedAt?: string | null;
  ageConfirmed?: boolean;
  status?: string;
};

async function readToken(req: NextRequest): Promise<TokenPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  for (const name of SESSION_COOKIES) {
    const raw = req.cookies.get(name)?.value;
    if (!raw) continue;
    try {
      const payload = await decode({ token: raw, secret, salt: name });
      if (payload) return payload as unknown as TokenPayload;
    } catch {
      // try the next cookie name
    }
  }
  return null;
}

function totpFresh(t: string | null | undefined): boolean {
  if (!t) return false;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) && Date.now() - ms < 12 * 60 * 60 * 1000;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  const isOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding");
  if (!isAdmin && !isAccount && !isOnboarding) return NextResponse.next();

  let token: TokenPayload | null = null;
  try {
    token = await readToken(req);
  } catch {
    token = null;
  }
  const signin = new URL("/signin", req.url);

  if (!token) {
    // No session at all: auth pages stay reachable only if they are the
    // TOTP/setup pages is NOT the case here — all guarded paths need login.
    return NextResponse.redirect(signin);
  }
  if (token.status === "SUSPENDED") {
    // Suspended users can only see onboarding (which shows the blocked state).
    if (isOnboarding) return NextResponse.next();
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  if (isAdmin) {
    if (token.role !== "ADMIN" || !token.adminRole) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (pathname === "/admin/verify-2fa" || pathname === "/admin/setup-2fa") {
      return NextResponse.next();
    }
    if (!totpFresh(token.totpVerifiedAt)) {
      return NextResponse.redirect(new URL("/admin/verify-2fa", req.url));
    }
    return NextResponse.next();
  }
  // /account and /onboarding: enforce onboarding completion.
  if (!token.ageConfirmed && !isOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/account", "/account/:path*", "/onboarding", "/onboarding/:path*"],
};
