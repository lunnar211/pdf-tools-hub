import { describe, it, expect } from "vitest";
import { buildAuthCallbackUrl } from "@/lib/supabase/callback-url";

// The Google sign-in button's redirectTo, pinned without a browser: the
// URL must always stay on this site's own origin + /auth/callback, and a
// hostile `next` must fall back to the validated default instead of
// leaking into the redirect. The origin itself comes from
// window.location.origin in the browser — never from user input, never
// from Supabase's Site URL setting — so these tests pass the origin in
// and assert it is preserved exactly.

const ORIGIN = "https://pdf-tools-hub-nine-lac.vercel.app";

describe("buildAuthCallbackUrl", () => {
  it("builds this site's own callback URL with a valid relative next path", () => {
    expect(buildAuthCallbackUrl(ORIGIN, "/account")).toBe(
      "https://pdf-tools-hub-nine-lac.vercel.app/auth/callback?next=%2Faccount",
    );
    expect(buildAuthCallbackUrl(ORIGIN, "/admin/users")).toBe(
      "https://pdf-tools-hub-nine-lac.vercel.app/auth/callback?next=%2Fadmin%2Fusers",
    );
  });

  it("never lets an absolute or protocol-relative next escape this site", () => {
    for (const hostile of [
      "https://evil.example/phish",
      "http://evil.example/",
      "//evil.example/account",
      "/\\evil.example",
    ]) {
      const url = buildAuthCallbackUrl(ORIGIN, hostile);
      expect(url.startsWith(`${ORIGIN}/auth/callback?next=`)).toBe(true);
      expect(url).not.toContain("evil.example");
      // Hostile input falls back to the validated default path.
      expect(url).toBe("https://pdf-tools-hub-nine-lac.vercel.app/auth/callback?next=%2Faccount");
    }
  });

  it("falls back for missing or control-character next values", () => {
    expect(buildAuthCallbackUrl(ORIGIN, "")).toBe(
      "https://pdf-tools-hub-nine-lac.vercel.app/auth/callback?next=%2Faccount",
    );
    expect(buildAuthCallbackUrl(ORIGIN, "/account\nX-Injected: 1")).toBe(
      "https://pdf-tools-hub-nine-lac.vercel.app/auth/callback?next=%2Faccount",
    );
  });

  it("tolerates a trailing slash on the origin without doubling it", () => {
    expect(buildAuthCallbackUrl(`${ORIGIN}/`, "/account")).toBe(
      "https://pdf-tools-hub-nine-lac.vercel.app/auth/callback?next=%2Faccount",
    );
  });
});
