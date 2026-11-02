import { describe, it, expect } from "vitest";
import { resolveAdminGate } from "@/lib/admin-gate";

// The admin layout's hard gate, pinned without rendering: the layout calls
// this and redirects on any non-null result, so no admin UI, nav, or
// content can render for outsiders or non-admins. Fail-closed throughout:
// a missing session goes to /signin, and anything less than a full ADMIN
// row (including a missing DB row) goes to / — never the console.

describe("resolveAdminGate", () => {
  it("sends a visitor with no session to /signin", () => {
    expect(resolveAdminGate(null, null)).toBe("signin");
    expect(
      resolveAdminGate(null, { role: "ADMIN", adminRole: "SUPER" }),
    ).toBe("signin");
  });

  it("sends a signed-in user without an ADMIN row home, never to the console", () => {
    const user = { id: "user-1" };
    expect(resolveAdminGate(user, null)).toBe("home");
    expect(resolveAdminGate(user, { role: "USER", adminRole: null })).toBe("home");
  });

  it("sends an ADMIN role without an adminRole home", () => {
    expect(resolveAdminGate({ id: "user-1" }, { role: "ADMIN", adminRole: null })).toBe("home");
  });

  it("admits only a full ADMIN row with an adminRole", () => {
    expect(resolveAdminGate({ id: "user-1" }, { role: "ADMIN", adminRole: "SUPER" })).toBeNull();
    expect(resolveAdminGate({ id: "user-1" }, { role: "ADMIN", adminRole: "SUPPORT" })).toBeNull();
    expect(resolveAdminGate({ id: "user-1" }, { role: "ADMIN", adminRole: "FINANCE" })).toBeNull();
  });
});
