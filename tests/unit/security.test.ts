import { describe, it, expect } from "vitest";
import { hashIp, encryptSecret, decryptSecret, generateTotpSecret, totpCode, verifyTotp } from "@/lib/security";

describe("IP hashing", () => {
  it("is deterministic for the same salt and differs across salts", () => {
    expect(hashIp("203.0.113.10", "salt-a")).toBe(hashIp("203.0.113.10", "salt-a"));
    expect(hashIp("203.0.113.10", "salt-a")).not.toBe(hashIp("203.0.113.10", "salt-b"));
    expect(hashIp("203.0.113.10", "salt-a")).not.toContain("203.0.113.10");
    expect(hashIp("203.0.113.10", "salt-a")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("TOTP secret encryption", () => {
  it("round-trips through AES-256-GCM", () => {
    process.env.AUTH_SECRET = "test-secret-for-unit-tests-only";
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(enc).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(enc)).toBe("JBSWY3DPEHPK3PXP");
  });
  it("rejects tampered ciphertext", () => {
    process.env.AUTH_SECRET = "test-secret-for-unit-tests-only";
    const enc = encryptSecret("JBSWY3DPEHPK3PXP");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("TOTP codes", () => {
  it("verifies the code for its own time step and rejects wrong codes", () => {
    const secret = generateTotpSecret();
    const at = 1_700_000_000_000;
    const code = totpCode(secret, at);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, at)).toBe(true);
    expect(verifyTotp(secret, "000000", at)).toBe(code === "000000");
    expect(verifyTotp(secret, "not-a-code", at)).toBe(false);
  });
});
