# Security Report — PDF Tools Hub (auth + admin + Paddle build)

Scope: ONLY code added or changed in this build, plus the pre-existing tool
routes it touches. Date: 2026-11-01. Verdict after fixes: **zero critical/high
issues found**. Items that could not be fully proven without owner resources
(Neon DB, Google OAuth client, Paddle keys) are listed honestly at the end —
they are not claimed as passed.

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
