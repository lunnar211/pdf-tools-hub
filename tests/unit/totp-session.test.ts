import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTotpCookieValue,
  parseTotpVerifiedAt,
  totpCookieFresh,
  TOTP_VALID_MS,
} from "@/lib/totp-session";

describe("TOTP session cookie (signed, server-checked)", () => {
  const OLD = process.env.TOTP_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.TOTP_ENCRYPTION_KEY = "test-totp-key-for-unit-tests-only";
  });
  afterEach(() => {
    if (OLD === undefined) delete process.env.TOTP_ENCRYPTION_KEY;
    else process.env.TOTP_ENCRYPTION_KEY = OLD;
  });

  it("round-trips a fresh timestamp", () => {
    const now = Date.now();
    const value = createTotpCookieValue(now);
    expect(parseTotpVerifiedAt(value)).toBe(new Date(now).toISOString());
    expect(totpCookieFresh(value)).toBe(true);
  });
  it("rejects tampered timestamps and signatures", () => {
    const value = createTotpCookieValue();
    const [ts, sig] = value.split(".");
    expect(parseTotpVerifiedAt(`${Number(ts) + 1000}.${sig}`)).toBeNull();
    expect(parseTotpVerifiedAt(`${ts}.0000000000000000000000000000000000000000000000000000000000000000`)).toBeNull();
    expect(parseTotpVerifiedAt("garbage")).toBeNull();
    expect(parseTotpVerifiedAt(null)).toBeNull();
    expect(parseTotpVerifiedAt("")).toBeNull();
  });
  it("rejects expired values", () => {
    const old = createTotpCookieValue(Date.now() - TOTP_VALID_MS - 1000);
    expect(parseTotpVerifiedAt(old)).not.toBeNull(); // signature still valid
    expect(totpCookieFresh(old)).toBe(false);
  });
  it("rejects values signed under a different key", () => {
    const value = createTotpCookieValue();
    process.env.TOTP_ENCRYPTION_KEY = "a-different-key";
    expect(parseTotpVerifiedAt(value)).toBeNull();
  });
});
