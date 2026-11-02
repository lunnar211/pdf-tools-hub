# Email + password sign-in (PDF Tools Hub)

Sign in with Google stays. Email + password is offered alongside it on
`/signin`, using the same Supabase Auth project ("LeadForge") and the
same session, so ONE account — the owner's `dipeshkarki8292@gmail.com`
account, created once in the Supabase dashboard — signs into this site,
AI Studio, and the AI Video Clipper. Admin gating is unchanged:
`ADMIN_EMAILS` allowlist + mandatory TOTP 2FA.

## What was already here (Nov 1, commit 21aa42d)

The email form itself (`app/signin/signin-form.tsx`, email + password
fields calling `supabase.auth.signInWithPassword` with one generic error)
already existed. This build verified it, made it testable, fixed the
Google-only page copy, and added the admin hard gate + login-redirect
hardening below. No sign-in behavior was changed in the process.

## What this build added (files, one line each)

- `lib/supabase/email-signin.ts` — testable email sign-in wrapper: trims
  the email, refuses blank inputs locally, maps every failure to one
  generic message (never leaks unknown-email vs wrong-password vs
  disabled-provider).
- `app/signin/signin-form.tsx` — Google button now builds its
  `redirectTo` via `buildAuthCallbackUrl`; email form now calls the
  tested `signInWithEmail` helper (same behavior, same generic error).
- `lib/supabase/callback-url.ts` — builds `own-origin + /auth/callback`
  with a re-validated `next`; hostile `next` values fall back to
  `/account` instead of ever leaving this site.
- `lib/admin-gate.ts` — pure admin-layout gate decision (no session →
  `/signin`; anything less than a full ADMIN row → `/`; full ADMIN row →
  admitted), unit-tested without rendering.
- `app/admin/layout.tsx` — now decides via `resolveAdminGate`
  (behavior identical to the inline checks it replaced); no admin UI,
  nav, or content renders for outsiders or non-admins.
- `components/footer.tsx` — now a client component that shows the
  Admin link only after the browser session check confirms a session
  (starts hidden). The navbar already hid Admin from guests and
  non-admins; it was not changed.
- `app/signin/page.tsx` — copy no longer Google-only: metadata, intro,
  and privacy note now mention the email option and that this site
  never stores passwords.
- `app/account/page.tsx` — "Google sign-in identity" wording corrected
  to "Supabase sign-in identity (Google or email)".
- `tests/unit/email-signin.test.ts` — mocked-client tests: success +
  trimmed email, generic error on wrong password / unknown email /
  disabled provider, blank inputs never call Supabase.
- `tests/unit/admin-gate.test.ts` — gate decisions: no session →
  signin; missing/non-ADMIN row → home; full ADMIN row → admitted.
- `tests/unit/callback-url.test.ts` — callback URL stays on this
  site's origin; hostile `next` values fall back; trailing-slash
  origin handled.

## What deliberately does NOT exist

- No public sign-up form. Accounts are created only by the site owner
  in the Supabase dashboard.
- No password storage anywhere in this app. Passwords live only in
  Supabase Auth.
- No in-app password-reset form. Reset is dashboard-only: the owner
  sends a reset from Supabase Auth (or the user uses Supabase's emailed
  reset link if the project has a mail sender configured).
- No AI provider code (this site has none by design) and no schema
  change: zero DB changes were needed — the shared Prisma schema
  already carries `supabaseId`, and first-login upsert is provider
  agnostic (see below).

## How the flows work (verified in code)

- Google: button → `redirectTo` = this site's origin +
  `/auth/callback?next=<validated>` → callback exchanges the code,
  upserts the Prisma User (by `supabaseId`, then email), stamps
  `lastLoginAt`, and redirects only to a validated same-site path
  (anything else → `/signin` with a generic error).
- Email: form → `signInWithPassword` sets the browser session directly
  (no callback hop) → app navigates to the validated `next` path.
  First-login upsert happens lazily via `getCurrentUser()` →
  `ensureDbUser()` on the next authenticated request (same treatment as
  Google users: allowlisted email → ADMIN/SUPER, anyone else → USER).
- Admin: proxy requires a session for `/admin/*` (else `/signin`) and a
  fresh TOTP cookie (else `/admin/verify-2fa`); the admin layout
  re-checks session + ADMIN role server-side (else `/signin` or `/`);
  individual pages additionally require fresh TOTP verification.
  Email sign-in alone never grants admin.
- Sign-out: `signOutBrowser()` clears the browser Supabase session AND
  posts to `/api/auth/signout`, which clears server cookies and the
  TOTP cookie. Identical for Google and email sessions.

## Owner's remaining steps, in order

1. Paste `DATABASE_URL` (pooler string) into this project's Vercel env
   and redeploy. Without it, auth shows the honest "not configured"
   state and no profile/admin row can load — login cannot work live.
2. Set the per-site TOTP secret in Vercel and enrol at
   `/admin/setup-2fa`, then verify at `/admin/verify-2fa`.
3. In the Supabase dashboard (shared "LeadForge" project, once for all
   three sites): enable the Email provider in Authentication settings.
4. In the same dashboard: create/confirm the `dipeshkarki8292@gmail.com`
   user with a password set by your own hands (never in chat, never in
   code). The Prisma User row picks up ADMIN role automatically for
   allowlisted emails on first login via `ensureDbUser` — no manual row
   edit is needed.
5. Redeploy after steps 1–2, then run the checklist below live.

Note: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`ADMIN_EMAILS` are already set in this project's Vercel env (production
+ preview) by the parent. Do NOT touch existing env vars, and never
push/run the Prisma schema from this repo — the shared schema lives
with AI Studio.

## Manual QA checklist (live, after the steps above)

- [ ] Email sign-in with the dashboard-created 8292 account lands on
      the account page; Google sign-in still works for the same account.
- [ ] Wrong password shows only the generic error (no hint whether the
      email exists or the provider is disabled).
- [ ] A signed-in non-allowlisted user opening `/admin` is redirected
      (to `/`) and never sees console UI; a logged-out visitor opening
      `/admin` is redirected to `/signin` with zero admin UI rendered.
- [ ] Footer and navbar show no Admin link while logged out; the Admin
      link appears only with a session (navbar: only for admins).
- [ ] Admin pages still require TOTP verification after sign-in.
- [ ] Sign-out clears the session (account/admin pages redirect to
      `/signin` afterwards).
- [ ] Google sign-in lands back on this site (never another site), and
      a crafted `?next=https://evil.example` never leaves this site.

## Honest gaps

- Login is NOT live until `DATABASE_URL` + TOTP secret + redeploy land
  (see steps above); until then the sign-in page honestly reports
  "not configured".
- End-to-end live login (real 8292 account, real TOTP) is still owed
  as final proof — unit tests here use mocked clients only, and the
  Playwright e2e suite was not run (no browsers in this sandbox).
- Password reset is dashboard-only (no in-app reset form).
- If the DB is unreachable, admin pages fail closed (redirect `/`),
  which is safe but means admin is unavailable until the DB is back.
