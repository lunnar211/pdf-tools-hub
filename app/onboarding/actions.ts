"use server";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ageGate } from "@/lib/age";

export type OnboardingResult =
  | { ok: true; gate: string }
  | { ok: false; error: string }
  | { ok: true; gate: "deleted-under13" };

export async function submitOnboarding(formData: FormData): Promise<OnboardingResult> {
  const { supabaseUser, dbUser } = await getCurrentUser();
  if (!supabaseUser) return { ok: false, error: "You are not signed in." };
  if (!prisma) return { ok: false, error: "Account database is not configured yet. Please try again later." };
  const dobRaw = String(formData.get("dob") ?? "");
  const confirmed = formData.get("confirm") === "on";
  const terms = formData.get("terms") === "on";
  if (!confirmed || !terms) return { ok: false, error: "Please tick both boxes to continue." };
  const dob = new Date(`${dobRaw}T00:00:00Z`);
  if (!Number.isFinite(dob.getTime()) || dobRaw.length !== 10) {
    return { ok: false, error: "Please enter a valid date of birth." };
  }
  if (dob.getTime() > Date.now()) return { ok: false, error: "Date of birth cannot be in the future." };
  const gate = ageGate(dob);
  const user = dbUser;
  if (!user) return { ok: false, error: "Account not found. Please sign in again." };

  if (gate === "blocked-under13") {
    // No data kept: the whole Prisma account row (and its relations via
    // cascade) is deleted. HONEST LIMIT (Supabase switch): the Supabase Auth
    // identity itself cannot be deleted with the browser anon key — only
    // with the service-role key or from the Supabase dashboard. No
    // service-role key is introduced for this (see COMPLIANCE_CHECKLIST.md):
    // the client signs the user out, and the owner deletes the Auth identity
    // from the dashboard on request. The site keeps no under-13 data.
    await prisma.user.delete({ where: { id: user.id } });
    return { ok: true, gate: "deleted-under13" };
  }
  if (gate === "blocked-13-15") {
    await prisma.user.update({
      where: { id: user.id },
      data: { dateOfBirth: dob, status: "SUSPENDED", termsAcceptedAt: new Date() },
    });
    return { ok: true, gate: "blocked-13-15" };
  }
  // 16-17: free only (plan stays FREE, checkout blocks under-18s).
  // 18+: full access including paid plans.
  // No session-flag update is needed any more: ageConfirmed is read from
  // the DB on every request (getCurrentUser), unlike the old JWT flags.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      dateOfBirth: dob,
      ageConfirmed: true,
      ageConfirmedAt: new Date(),
      termsAcceptedAt: new Date(),
      status: "ACTIVE",
      plan: gate === "free-only" ? "FREE" : user.plan,
    },
  });
  return { ok: true, gate };
}
