import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { canBuyPaid } from "@/lib/age";
import { createCheckoutUrl, paddleConfigured } from "@/lib/paddle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/checkout — Supabase auth + age 18+ required. Creates a Paddle
// transaction and returns the hosted checkout URL. No Paddle.js, no card
// data on this site. Customer mapping is re-keyed to Supabase identity:
// customData carries both the Prisma userId and the Supabase user id, so
// the webhook can resolve the buyer by supabaseId first (see
// /api/webhooks/paddle).
export async function POST() {
  const { supabaseUser, dbUser: user } = await getCurrentUser();
  if (!supabaseUser) return Response.json({ error: "Sign in to upgrade." }, { status: 401 });
  if (!paddleConfigured()) {
    return Response.json({ error: "Checkout is not configured yet." }, { status: 503 });
  }
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });
  if (user.status === "SUSPENDED") return Response.json({ error: "This account is suspended." }, { status: 403 });
  if (!canBuyPaid(user.dateOfBirth)) {
    return Response.json({ error: "Paid plans need an account age of 18 or over." }, { status: 403 });
  }
  if (user.plan === "PREMIUM") return Response.json({ error: "You are already on Premium." }, { status: 409 });
  try {
    const url = await createCheckoutUrl({ email: user.email, userId: user.id, supabaseId: user.supabaseId ?? supabaseUser.id });
    if (!url) return Response.json({ error: "Checkout could not be created." }, { status: 502 });
    return Response.json({ checkoutUrl: url });
  } catch {
    return Response.json({ error: "Checkout could not be created." }, { status: 502 });
  }
}
