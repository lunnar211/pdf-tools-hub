import { describe, it, expect, beforeAll } from "vitest";
import crypto from "node:crypto";
import { verifyPaddleSignature } from "@/lib/paddle";

// Paddle signature format (from the SDK source): header `ts=<unix>;h1=<hex>`,
// where h1 = HMAC-SHA256(webhookSecret, `${ts}:${rawBody}`), fresh timestamps only.
const SECRET = "test-webhook-secret";
const BODY = JSON.stringify({ event_id: "evt_test_123", event_type: "transaction.completed", data: { id: "txn_1" } });

function headerFor(body: string, ts: number): string {
  const h1 = crypto.createHmac("sha256", SECRET).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("Paddle webhook signature verification (SDK)", () => {
  beforeAll(() => {
    process.env.PADDLE_API_KEY = "test-api-key";
    process.env.PADDLE_WEBHOOK_SECRET = SECRET;
    process.env.PADDLE_ENV = "sandbox";
  });
  it("accepts a correctly signed fresh webhook", async () => {
    const ts = Math.floor(Date.now() / 1000);
    await expect(verifyPaddleSignature(BODY, headerFor(BODY, ts))).resolves.toBe(true);
  });
  it("rejects a tampered body, a wrong secret signature, and a stale timestamp", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const good = headerFor(BODY, ts);
    await expect(verifyPaddleSignature(BODY + " ", good)).resolves.toBe(false);
    await expect(verifyPaddleSignature(BODY, "ts=1;h1=deadbeef")).resolves.toBe(false);
    await expect(verifyPaddleSignature(BODY, null)).resolves.toBe(false);
    await expect(verifyPaddleSignature(BODY, headerFor(BODY, ts - 3600))).resolves.toBe(false);
  });
});
