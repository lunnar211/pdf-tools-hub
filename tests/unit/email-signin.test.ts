import { describe, it, expect, vi } from "vitest";
import {
  signInWithEmail,
  EMAIL_SIGNIN_GENERIC_ERROR,
  type EmailSignInClient,
} from "@/lib/supabase/email-signin";

// The sign-in form's email path, tested without a DOM: the form calls
// signInWithEmail with the browser Supabase client, so these fake-client
// cases pin the exact behavior the form exposes. No real Supabase call is
// ever made here, and no password value is asserted or logged — the fakes
// use placeholder strings only.

function fakeClient(impl: (args: { email: string; password: string }) => unknown) {
  const calls: Array<{ email: string; password: string }> = [];
  const client: EmailSignInClient = {
    auth: {
      signInWithPassword: async (args) => {
        calls.push(args);
        const error = await impl(args);
        return { error };
      },
    },
  };
  return { client, calls };
}

describe("signInWithEmail", () => {
  it("returns ok on success and passes the trimmed email through", async () => {
    const { client, calls } = fakeClient(() => null);
    const result = await signInWithEmail(client, "  Owner@Example.com  ", "placeholder-password");
    expect(result).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].email).toBe("Owner@Example.com");
    // Password passes through exactly as typed (never trimmed).
    expect(calls[0].password).toBe("placeholder-password");
  });

  it("maps a wrong password to the generic message, never the provider error", async () => {
    const { client } = fakeClient(() => new Error("Invalid login credentials"));
    const result = await signInWithEmail(client, "owner@example.com", "wrong-password");
    expect(result).toEqual({ ok: false, message: EMAIL_SIGNIN_GENERIC_ERROR });
    expect(JSON.stringify(result)).not.toContain("Invalid login credentials");
  });

  it("maps an unknown email and a disabled provider to the same generic message", async () => {
    const unknown = fakeClient(() => new Error("User not found"));
    expect(await signInWithEmail(unknown.client, "nobody@example.com", "placeholder-password")).toEqual({
      ok: false,
      message: EMAIL_SIGNIN_GENERIC_ERROR,
    });
    const disabled = fakeClient(() => new Error("Email provider disabled"));
    expect(await signInWithEmail(disabled.client, "owner@example.com", "placeholder-password")).toEqual({
      ok: false,
      message: EMAIL_SIGNIN_GENERIC_ERROR,
    });
  });

  it("refuses blank email/password locally without calling Supabase", async () => {
    const spy = vi.fn(() => null);
    const { client, calls } = fakeClient(spy);
    expect(await signInWithEmail(client, "   ", "placeholder-password")).toEqual({
      ok: false,
      message: EMAIL_SIGNIN_GENERIC_ERROR,
    });
    expect(await signInWithEmail(client, "owner@example.com", "")).toEqual({
      ok: false,
      message: EMAIL_SIGNIN_GENERIC_ERROR,
    });
    expect(calls).toHaveLength(0);
    expect(spy).not.toHaveBeenCalled();
  });
});
