import { prisma } from "@/lib/prisma";
import { verifyPaddleSignature } from "@/lib/paddle";
import { logError } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Paddle webhook: signature-verified (SDK), idempotent via WebhookEvent.eventId
// unique (a duplicate event id answers 200 "ignored"), and NEVER trusts a
// client claim. Only customer id, plan, status, and invoice/transaction ids
// are stored — never card data.
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("paddle-signature");
  const valid = await verifyPaddleSignature(body, signature);
  if (!valid) return Response.json({ error: "Invalid signature." }, { status: 400 });
  let event: { event_id: string; event_type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!prisma) return Response.json({ error: "Database not configured." }, { status: 503 });
  try {
    await prisma.webhookEvent.create({
      data: { provider: "PADDLE", eventId: event.event_id, eventType: event.event_type, processedAt: new Date() },
    });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") return Response.json({ ok: true, ignored: true });
    throw e;
  }
  try {
    await handleEvent(event.event_type, event.data);
  } catch (err) {
    await logError("paddle-webhook", err instanceof Error ? err.message : "webhook handler failed", "/api/webhooks/paddle");
    // Still 200: the event is recorded; a handler bug must not make Paddle
    // retry forever. The error log surfaces it in /admin/logs.
  }
  return Response.json({ ok: true });
}

async function resolveUserId(data: Record<string, unknown>): Promise<string | null> {
  const custom = data.custom_data as Record<string, unknown> | undefined;
  if (typeof custom?.userId === "string") return custom.userId;
  const customerId = data.customer_id as string | undefined;
  const subId = (data.subscription_id as string | undefined) ?? (data.id as string | undefined);
  if (customerId && prisma) {
    const sub = await prisma.subscription.findFirst({ where: { customerId } });
    if (sub) return sub.userId;
  }
  if (subId && prisma) {
    const sub = await prisma.subscription.findUnique({ where: { subscriptionId: subId } });
    if (sub) return sub.userId;
  }
  return null;
}

async function handleEvent(type: string, data: Record<string, unknown>) {
  if (!prisma) return;
  if (type === "transaction.completed") {
    const userId = await resolveUserId(data);
    if (!userId) return;
    const totals = data.details as { totals?: { total?: string; currency_code?: string } } | undefined;
    const amount = parseInt(totals?.totals?.total ?? "0", 10) || 0;
    const currency = totals?.totals?.currency_code ?? "USD";
    await prisma.payment.upsert({
      where: { transactionId: String(data.id) },
      create: {
        userId,
        provider: "PADDLE",
        transactionId: String(data.id),
        invoiceId: (data.invoice_id as string | undefined) ?? null,
        amount,
        currency,
        status: String(data.status ?? "completed"),
      },
      update: { status: String(data.status ?? "completed") },
    });
    const subscriptionId = data.subscription_id as string | undefined;
    if (subscriptionId) {
      await prisma.subscription.upsert({
        where: { subscriptionId },
        create: {
          userId,
          provider: "PADDLE",
          customerId: String(data.customer_id ?? ""),
          subscriptionId,
          plan: "PREMIUM",
          status: "active",
        },
        update: { status: "active", plan: "PREMIUM" },
      });
      await prisma.user.update({ where: { id: userId }, data: { plan: "PREMIUM" } });
    }
    return;
  }
  if (type === "subscription.created" || type === "subscription.updated" || type === "subscription.canceled") {
    const userId = await resolveUserId(data);
    if (!userId) return;
    const status = String(data.status ?? "");
    const period = data.current_billing_period as { ends_at?: string } | undefined;
    const plan: "PREMIUM" | "FREE" = status === "active" || status === "trialing" || status === "past_due" ? "PREMIUM" : "FREE";
    await prisma.subscription.upsert({
      where: { subscriptionId: String(data.id) },
      create: {
        userId,
        provider: "PADDLE",
        customerId: String(data.customer_id ?? ""),
        subscriptionId: String(data.id),
        plan,
        status,
        currentPeriodEnd: period?.ends_at ? new Date(period.ends_at) : null,
      },
      update: {
        status,
        plan,
        currentPeriodEnd: period?.ends_at ? new Date(period.ends_at) : null,
      },
    });
    await prisma.user.update({ where: { id: userId }, data: { plan } });
  }
}
