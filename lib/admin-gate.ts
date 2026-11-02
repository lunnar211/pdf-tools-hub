// Pure admin-layout gate decision, extracted from app/admin/layout.tsx so
// the rule is unit-testable without rendering. The layout itself still
// performs the redirects; this function only DECIDES, it never renders
// anything — so no admin UI, nav, or content can leak to an outsider
// through this path. Fail-closed at every step: a missing session sends
// the visitor to /signin, and anything less than a full ADMIN row sends
// them to / (never the console). The proxy (proxy.ts) enforces the same
// session requirement even earlier, before rendering starts; the layout
// re-checks because the proxy is only an optimistic first gate.
export type AdminGateDecision = "signin" | "home" | null;

export function resolveAdminGate(
  supabaseUser: { id: string } | null,
  dbUser: { role: string; adminRole: string | null } | null,
): AdminGateDecision {
  if (!supabaseUser) return "signin";
  if (!dbUser || dbUser.role !== "ADMIN" || !dbUser.adminRole) return "home";
  return null;
}
