# Security Report — PDF Tools Hub (auth + admin + Paddle build)

Scope: ONLY code added or changed in this build, plus the pre-existing tool
routes it touches. Date: 2026-11-01. Verdict after fixes: **zero critical/high
issues found**. Items that could not be fully proven without owner resources
(Neon DB, Google OAuth client, Paddle keys) are listed honestly at the end —
they are not claimed as passed.

## ADDENDUM 2026-11-01 — Supabase Auth rework (supersedes the Auth.js claims below)

Auth.js v5 is REMOVED (deleted: `auth.ts`, `app/api/auth/[...nextauth]/`,
`components/session-provider.tsx`, `types/next-auth.d.ts`; dependencies
`next-auth` + `@auth/prisma-adapter` uninstalled; added `@supabase/ssr` +
`@supabase/supabase-js`). Identity is now Supabase Auth (Google provider) on
the owner's EXISTING "LeadForge" project — no new Google Cloud OAuth client,
no `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env vars, no service-role key.
What supersedes what in the original report:

- **A01 (was: JWT role in proxy):** the proxy now checks the Supabase
  session cookie + the signed `pth-totp` cookie only (never Prisma); role,
  age, suspension, and TOTP are re-checked server-side in every layout, page,
  and API route (`lib/supabase/server.ts`, `lib/admin.ts`). A forged or
  tampered TOTP cookie fails HMAC verification → treated as unverified →
  redirect to `/admin/verify-2fa`; a missing Supabase session → `/signin`.
  IDOR protection is unchanged in shape and stronger in keying: export/delete
  resolve the user from the Supabase session only, never a client id; Paddle
  customData now carries `supabaseId` and the webhook resolves by supabaseId
  first, then legacy Prisma id, then customer/subscription.
- **A02 (was: AUTH_SECRET):** TOTP secrets are AES-256-GCM encrypted with a
  key derived from `TOTP_ENCRYPTION_KEY` (legacy `AUTH_SECRET` accepted only
  as a migration fallback so existing encrypted secrets keep decrypting);
  IP hashes use the same key. The TOTP cookie value is `timestamp.HMAC`
  (SHA-256, timing-safe compare, 12h window) — unit-tested tamper/expiry/
  wrong-key rejection (4 tests).
- **A05/CSP:** `connect-src` now allowlists the Supabase project host
  (`https://omnqidmauvloedscncir.supabase.co`, public URL, not a secret) for
  browser sign-out/session calls, and `img-src` allowlists Google avatars
  (`lh3.googleusercontent.com`) for account avatars. All other headers
  unchanged and re-verified live (see probes below).
- **A06:** `npm audit` STILL cannot run in this sandbox (same registry
  policy denial on the audit endpoint, re-confirmed this run) — still an
  honest gap, not a pass. New dependency majors: `@supabase/ssr` 0.12.7,
  `@supabase/supabase-js` 2.x (Auth.js removed).
- **A07 (was: encrypted JWT sessions):** sessions are Supabase Auth cookies
  managed by `@supabase/ssr` (httpOnly, refreshed by the proxy). Admin TOTP
  is KEPT custom (not Supabase built-in MFA): built-in MFA would add a
  second authenticator enrolment on the Auth user for a step only admins
  take, while the custom TOTP was already built, tested, and is server-checked
  on every admin page/API route. Admins do NOT get a fresh TOTP automatically
  reset at sign-in any more (no JWT to reset it in): the TOTP cookie is
  cleared on sign-out (`/api/auth/signout`) and expires after 12h, so a
  signed-out-then-back-in admin within 12h keeps a valid second step — a
  deliberate, documented trade-off (the cookie is httpOnly + HMAC-signed +
  bound to the browser; role is still re-checked server-side).
- **New surface — open redirect:** `/auth/callback` and `/signin` validate
  `next` with `lib/redirect.ts` (relative paths only; absolute,
  protocol-relative, backslash, scheme, and control-character tricks all fall
  back to `/account`). Unit-tested (5 tests) + Playwright-probed with
  `https://evil.example` and `//evil.example` next values → never leaves the
  site (lands on `/signin?error=signin_failed` for the fake code).
- **New surface — CSRF:** all state-changing routes remain POST/server
  actions gated by the Supabase session cookie + server-side role checks;
  no GET route mutates application state (the callback only exchanges an
  OAuth code for a session, as OAuth requires, and its redirect target is
  validated).
- **Honest Auth-identity limit (NOT a code bug, stated everywhere it
  matters):** account delete and the under-13 age gate delete the Prisma
  profile and sign the user out, but CANNOT delete the Supabase Auth identity
  with the anon key — that needs the service-role key or a dashboard
  deletion. No service-role key was introduced (it would be a far larger
  secret-handling surface for a delete-only need). The account page, the
  delete route response (`supabaseIdentityRetained: true`), the onboarding
  action comment, README, and COMPLIANCE_CHECKLIST all say this plainly.

Retest for this rework (local production build, no DATABASE_URL, no Supabase
env — the unconfigured state, so live Google login is NOT proven here):

| Probe | Result |
|---|---|
| `npm run build` (to file, exit code echoed) | EXIT 0; `/auth/callback`, `/api/auth/signout`, `/api/account/me` in route table |
| `npx tsc --noEmit` | EXIT 0 |
| `npm run lint` | EXIT 0 (3 warnings: 2 deliberate full-reload navigations after sign-out, 1 pre-existing alt-text) |
| `npm test` (vitest) | 27 passed / 27 (7 files: incl. new redirect + totp-session suites) |
| `npx playwright test` | 14 passed / 14 (9 pre-existing + 5 new auth-surface tests) |
| `GET /` / `GET /admin` / `GET /account` logged out | 200 / 307 → `/signin` / 307 → `/signin` |
| `GET /api/account/me` logged out | 200 `{"signedIn":false}` |
| `POST /api/checkout`, `/api/account/export`, `/api/account/delete` logged out | 401 / 401 / 401 |
| `GET /api/admin/overview`, `/api/admin/money/export` logged out | 403 / 403 |
| `/auth/callback?code=fake&next=https://evil.example` | 307 → `/signin?error=signin_failed` (never evil.example) |
| `/auth/callback?code=fake&next=//evil.example` | 307 → `/signin?error=signin_failed` |
| `POST /api/image-to-pdf` 1px PNG (guest) | 200, 1168 bytes, `%PDF` magic — regression PASS |
| Security headers on `/` | CSP (incl. Supabase host + avatar host), HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy — all present |
| Sitemap | 0 occurrences of `/admin`, `/account`, `/signin` |
| Secrets grep over tracked code (keys/tokens/private keys) | clean; no `next-auth` / `GOOGLE_CLIENT_*` code refs remain (docs mentions are "do NOT set" only) |
| `npm audit` | BLOCKED by sandbox registry policy (same as original report) — gap, not a pass |

Still NOT proven (owner taps required, unchanged from Limitations): live
Google login end-to-end (needs Supabase redirect URL
`https://pdf-tools-hub-nine-lac.vercel.app/auth/callback` + Vercel env vars
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `DATABASE_URL`
(pooler) + `ADMIN_EMAILS` + `TOTP_ENCRYPTION_KEY`); live two-account IDOR and
SUPPORT/FINANCE role-matrix tests; live Paddle sandbox checkout/webhook/
replay; live admin TOTP setup/verify; `npm audit` on an unblocked registry.
Live Google login is explicitly NOT claimed until those taps are done.

## Method

Code review of every new route/action, plus live probes against a local
production build (`npm run build` + `npm run start`, no DATABASE_URL, no
AUTH_SECRET, no Paddle keys — the unconfigured state), plus unit tests
(`npm test`: 18 passed) and Playwright (`npx playwright test`: 9 passed).

## OWASP Top 10 walkthrough

### A01 Broken Access Control
- **Admin pages:** `proxy.ts` requires session + role ADMIN + adminRole +
  totpVerifiedAt within 12h for `/admin/*` (except setup/verify pages, which
  still require an admin session). Non-admins are redirected to `/`, logged-out
  users to `/signin`.
- **Admin APIs:** every `/api/admin/*` route re-checks the session and role
  via `getAdminSession()` + role helpers (`lib/admin.ts`) — the proxy redirect
  alone is never trusted. Probe: `GET /api/admin/overview` logged out → 403;
  `POST /api/admin/jobs/cleanup` logged out → 403.
- **IDOR:** `/api/account/export` and `/api/account/delete` never accept a
  client-supplied user id; they resolve the user from the session email only.
  Job history on `/account` is queried by the session user's id only.
  Full two-account live test is NOT possible without the owner's Neon DB (see
  Limitations) — the protection is by construction, not yet by live test.
- **Privilege escalation:** role helpers enforce SUPER-only for plan changes,
  deletes, money edits, settings, IP blocks; SUPPORT is read + notes + support
  replies; FINANCE is view-only money. Enforced in server actions AND API
  routes. Live role-matrix test awaits owner admin accounts (see Limitations).
- **Forged role cookie:** a fake `authjs.session-token` (no valid JWE) fails
  `@auth/core/jwt` decode in the proxy → treated as no session → 307 to
  `/signin`. Probe verified.
- Result: PASS (by construction + probes); live role-matrix test still owed.

### A02 Cryptographic Failures
- TOTP secrets: AES-256-GCM encrypted with a key derived from AUTH_SECRET
  (`lib/security.ts`); `totpEnabled` only after a verified code. Unit-tested
  round-trip + tamper rejection.
- IPs: SHA-256 hashed with AUTH_SECRET salt; raw IPs never stored.
- AUTH_SECRET is per-site (documented); sharing it across sites would let one
  site forge the other's tokens — explicitly warned in README + .env.example.
- Result: PASS.

### A03 Injection
- SQL: Prisma only; grep for `$queryRaw`/`$executeRaw` → none. All queries are
  parameterized by Prisma Client.
- XSS: React escaping everywhere. The only `dangerouslySetInnerHTML` in the
  repo is pre-existing `components/tool-page.tsx` JSON-LD built from static
  `lib/tool-content.ts` strings via `JSON.stringify` — no user data flows into
  it. Rated Low/accepted, not a finding against this build.
- Result: PASS (with the noted pre-existing Low).

### A04 Insecure Design
- Age gates are server-enforced (onboarding action + checkout route), not
  UI-only: under-13 → account deleted; 13–15 → SUSPENDED; 16–17 → checkout
  403; 18+ → allowed. Unit-tested boundaries.
- Payments never trust client claims: the webhook re-verifies the Paddle
  signature with the SDK and maps plan from the verified event.
- Result: PASS.

### A05 Security Misconfiguration
- Security headers verified live: CSP, HSTS, X-Frame-Options DENY, nosniff,
  Referrer-Policy, Permissions-Policy, plus `X-Robots-Tag: noindex, nofollow`
  on `/admin/*` and `/account/*`. CSP `form-action` includes
  `https://accounts.google.com` for the OAuth flow.
- Error responses are generic (no stack traces, paths, or secrets).
- `.env*` files are git-ignored except `.env.example` (placeholders only);
  `git status` shows no `.env` files. Secrets grep (key/secret/token/password
  assignments in code) → clean.
- Result: PASS.

### A06 Vulnerable Components
- `npm audit` could NOT run in this sandbox: the registry proxy denies the
  audit endpoint (`policy_denied` on POST `/-/npm/v1/security/audits/quick`).
  This is an honest gap, not a pass: the owner (or CI with registry access)
  must run `npm audit` and fix critical/high findings. No audit findings are
  claimed. New dependencies are pinned majors: next-auth 5.0.0-beta.32,
  Prisma 6.19.3, Paddle SDK 3.10.0, qrcode 1.5.4, vitest 5.0.5, Playwright 1.64.1.
- Result: UNVERIFIED (environment block, not a code finding).

### A07 Authentication Failures
- Google-only sign-in, minimal scopes (openid, email, profile). No passwords,
  no fallback credential login, no hardcoded admin credentials anywhere.
- Admin bootstrap: first allowlisted Google login becomes SUPER; later role
  changes require an existing SUPER (server actions).
- TOTP: 12-hour verification window; admins re-verify each sign-in
  (totpVerifiedAt reset to null at sign-in).
- Sessions are encrypted JWTs (Auth.js JWE, A256CBC-HS512).
- Result: PASS (live admin login + TOTP flow awaits owner Google setup).

### A08 Software/Data Integrity
- Webhook signature verified with the Paddle SDK (`isSignatureValid`);
  bad signature → 400 (probe verified). Replayed event id → 200 ignored via
  `WebhookEvent.eventId` unique (code path; live replay test awaits Paddle
  sandbox keys).
- No server-side fetch of user-supplied URLs anywhere (grep clean) → no SSRF
  via this build. Paddle SDK calls only go to Paddle's API.
- Result: PASS (live replay test still owed).

### A09 Logging Failures
- Every admin action writes an AuditLog row (actor, action, target, hashed IP).
  Errors go to ErrorLog; webhook events to WebhookEvent; all three are visible
  in `/admin/logs`. Failed logins/admin denials surface as proxy redirects
  (no sensitive detail leaked).
- Result: PASS.

### A10 SSRF
- Covered under A08: no user-controlled server-side requests exist.
- Result: PASS.

## Additional probes (local production build)

| Probe | Result |
|---|---|
| `GET /admin` logged out | 307 → `/signin`, `X-Robots-Tag: noindex, nofollow` |
| `GET /account` logged out | 307 → `/signin` |
| `GET /api/admin/overview` logged out | 403 |
| `POST /api/admin/jobs/cleanup` logged out (cross-origin) | 403 |
| `POST /api/account/delete` logged out | 401 |
| `POST /api/checkout` logged out | 401 |
| `POST /api/webhooks/paddle` bad signature | 400 |
| `POST /api/support` invalid body | 400 |
| Forged session cookie → `/admin` | 307 → `/signin` |
| Guest burst: 25 rapid tool POSTs | 18×400 (validation) then 429s once the 20/day guest limit was hit — limit enforced |
| `POST /api/image-to-pdf` 1px PNG | 200, 1169 bytes, `%PDF` magic — regression PASS |
| Sitemap | 0 occurrences of `/admin`, `/account`, `/signin` |
| Secrets grep over tracked code | clean |
| Largest tracked file | `package-lock.json` 317 KB raw (~423 KB base64) — see note below |

## Note on package-lock.json size

The repo rule "every tracked file's base64 under ~120 KB" exists because the
old `deploy_vercel.py` upload shim passes each file as one CLI argument.
This project deploys via GitHub auto-deploy (Vercel pulls from git), NOT via
that shim, so `package-lock.json` does not break deployment. It was already
tracked before this build and grew with the new dependencies. It is kept
deliberately (reproducible installs); the shim limit does not apply to this
deploy path. No other tracked file exceeds 16 KB.

## Limitations — honestly NOT yet proven (owner taps required)

1. Live two-account IDOR test and live SUPPORT/FINANCE role-matrix test need
   the owner's Neon DB + Google OAuth client (no DATABASE_URL in this sandbox).
2. Live Paddle sandbox test (test cards, real webhook, replayed event id)
   needs Paddle sandbox keys + webhook secret (owner step).
3. Live admin login + TOTP setup/verify flow needs ADMIN_EMAILS + Google OAuth.
4. `npm audit` needs a registry that permits the audit endpoint.
5. Signed-in quota enforcement (Job counting) needs the DB; guest IP-limit
   enforcement IS proven live (burst test above).

## Fixes applied during this loop

- Server-action form handlers return `void` (type-level fix; no behavior change).
- Paddle transaction creation uses the SDK v3 shape (customer created first
  via `customers.create`, then `customerId`; fallback to customer-less
  transaction) — the original `customer: { email }` shape does not exist in
  SDK v3 and failed type-check.
- `auth()` is skipped in the tool gate when AUTH_SECRET is unset, so guest
  conversions do not spam MissingSecret errors.
- Pre-existing lint errors in `theme-toggle`/`cookie-banner` (sync setState in
  effect) fixed with async callbacks; lint now exits 0 (one pre-existing
  false-positive warning remains: jsx-a11y flagging lucide's `Image` icon).
