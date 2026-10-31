// Age gates (pure functions, unit-tested). Thresholds, honestly explained:
// - Under 13: blocked entirely, no data kept (COPPA + GDPR-K lower bound).
// - 13-15: account cannot be activated (blocked message).
// - 16-17: free account only, paid checkout blocked (GDPR default digital
//   consent age is 16; Nepal's Privacy Act 2018 sets no fixed digital-consent
//   age, so 16 is the conservative alignment).
// - 18+: paid plans allowed (contractual capacity).
// Self-declaration only; no ID documents are ever collected.

export type AgeGate = "blocked-under13" | "blocked-13-15" | "free-only" | "full";

export function computeAge(dob: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export function ageGate(dob: Date, now: Date = new Date()): AgeGate {
  const age = computeAge(dob, now);
  if (age < 13) return "blocked-under13";
  if (age < 16) return "blocked-13-15";
  if (age < 18) return "free-only";
  return "full";
}

export function canBuyPaid(dob: Date | null, now: Date = new Date()): boolean {
  if (!dob) return false;
  return ageGate(dob, now) === "full";
}
