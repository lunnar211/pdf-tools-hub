import { describe, it, expect } from "vitest";
import { computeAge, ageGate, canBuyPaid } from "@/lib/age";

// Fixed "now" so boundaries are exact, not date-dependent.
const NOW = new Date("2026-11-01T00:00:00Z");

describe("age gates", () => {
  it("computes age with birthday-not-yet-reached this year", () => {
    expect(computeAge(new Date("2008-11-02T00:00:00Z"), NOW)).toBe(17);
    expect(computeAge(new Date("2008-11-01T00:00:00Z"), NOW)).toBe(18);
  });
  it("blocks under-13 entirely", () => {
    expect(ageGate(new Date("2014-01-01T00:00:00Z"), NOW)).toBe("blocked-under13");
    expect(ageGate(new Date("2013-11-02T00:00:00Z"), NOW)).toBe("blocked-under13");
  });
  it("blocks 13-15 from activation", () => {
    expect(ageGate(new Date("2013-11-01T00:00:00Z"), NOW)).toBe("blocked-13-15");
    expect(ageGate(new Date("2010-11-02T00:00:00Z"), NOW)).toBe("blocked-13-15");
  });
  it("gives 16-17 free-only and 18+ full", () => {
    expect(ageGate(new Date("2010-11-01T00:00:00Z"), NOW)).toBe("free-only");
    expect(ageGate(new Date("2008-11-01T00:00:00Z"), NOW)).toBe("full");
  });
  it("paid checkout requires 18+ and a date of birth", () => {
    expect(canBuyPaid(null, NOW)).toBe(false);
    expect(canBuyPaid(new Date("2010-11-01T00:00:00Z"), NOW)).toBe(false);
    expect(canBuyPaid(new Date("2008-11-01T00:00:00Z"), NOW)).toBe(true);
  });
});
