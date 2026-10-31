// Paddle Billing (merchant of record). Sandbox first: PADDLE_ENV=sandbox.
// Never store card data; only customer id, plan, status, invoice/transaction ids.
// Env: PADDLE_API_KEY, PADDLE_WEBHOOK_SECRET, PADDLE_PRICE_ID, PADDLE_ENV.
import { Paddle, Environment } from "@paddle/paddle-node-sdk";

export function paddleConfigured(): boolean {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_PRICE_ID);
}

export function getPaddle(): Paddle | null {
  const key = process.env.PADDLE_API_KEY;
  if (!key) return null;
  const env = process.env.PADDLE_ENV === "production" ? Environment.production : Environment.sandbox;
  return new Paddle(key, { environment: env });
}

export async function createCheckoutUrl(opts: { email: string; userId: string }): Promise<string | null> {
  const paddle = getPaddle();
  const priceId = process.env.PADDLE_PRICE_ID;
  if (!paddle || !priceId) return null;
  // SDK v3 transactions take a customerId, not an email: create (or reuse) a
  // Paddle customer first. If that fails, fall back to a customer-less
  // transaction — the hosted checkout then collects the buyer's details, and
  // customData still links the webhook back to this user.
  let customerId: string | undefined;
  try {
    const customer = await paddle.customers.create({ email: opts.email });
    customerId = customer.id;
  } catch {
    customerId = undefined;
  }
  const tx = await paddle.transactions.create({
    items: [{ priceId, quantity: 1 }],
    ...(customerId ? { customerId } : {}),
    customData: { userId: opts.userId, site: "pdf-tools-hub" },
  });
  return tx.checkout?.url ?? null;
}

// Verify a Paddle webhook signature with the SDK. Returns false (never throws)
// for a bad/missing signature so the route can answer 400 cleanly.
export async function verifyPaddleSignature(body: string, signature: string | null): Promise<boolean> {
  const paddle = getPaddle();
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!paddle || !secret || !signature) return false;
  try {
    return await paddle.webhooks.isSignatureValid(body, secret, signature);
  } catch {
    return false;
  }
}
