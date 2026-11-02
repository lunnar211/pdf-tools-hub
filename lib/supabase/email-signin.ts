// Email + password sign-in via Supabase Auth, as a pure wrapper around
// supabase.auth.signInWithPassword so the behavior is unit-testable
// without a DOM. The sign-in form calls this; the Supabase client itself
// still comes from lib/supabase/client (public anon key only).
//
// Security shape (do not weaken):
// - The email is trimmed; the password is passed through exactly as typed
//   (never trimmed — a trailing space can be part of a password).
// - Blank email/password never reach Supabase: the call is refused locally.
// - EVERY failure maps to one generic message, so callers never learn
//   whether the email is unknown, the password is wrong, or the Email
//   provider is disabled in the Supabase dashboard.
// - No account is ever created here: sign-up is dashboard-only, by the
//   site owner. No password is stored anywhere in this app.
export const EMAIL_SIGNIN_GENERIC_ERROR =
  "Email or password is incorrect, or email sign-in is not enabled yet.";

export type EmailSignInClient = {
  auth: {
    signInWithPassword: (args: {
      email: string;
      password: string;
    }) => Promise<{ error: unknown }>;
  };
};

export type EmailSignInResult = { ok: true } | { ok: false; message: string };

export async function signInWithEmail(
  client: EmailSignInClient,
  email: string,
  password: string,
): Promise<EmailSignInResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { ok: false, message: EMAIL_SIGNIN_GENERIC_ERROR };
  }
  const { error } = await client.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });
  if (error) {
    return { ok: false, message: EMAIL_SIGNIN_GENERIC_ERROR };
  }
  return { ok: true };
}
