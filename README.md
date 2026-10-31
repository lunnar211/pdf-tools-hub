# PDF Tools Hub

Free, everyday PDF tools built with Next.js 16.4.3 (App Router), TypeScript and Tailwind CSS:
PDF to Word, Word to PDF, Image to PDF, Merge PDF, Split PDF and Compress PDF.
Plus: Google sign-in (Auth.js v5, JWT sessions), an admin panel with TOTP 2FA,
onboarding with age gates, and Paddle Billing for Premium.

Live: https://pdf-tools-hub-nine-lac.vercel.app
(Vercel project `pdf-tools-hub`, GitHub `lunnar211/pdf-tools-hub`, auto-deploys from `master`.
Note: `https://pdf-tools-hub.vercel.app` is a DIFFERENT app — do not use it for this repo.)

## Run locally

```bash
npm install
npm run dev
```

## Free tier

Guests: 20 conversions per day per IP (existing behavior, unchanged).
Signed-in FREE accounts: 100/day. PREMIUM: 1000/day. Limits are editable in
`/admin/settings` (SiteSetting quotas) and enforced by counting the user's Job
rows for today; guests keep the per-IP limit. PDFs up to 25 MB; images up to
10 MB each (max 20 per request).

## Rate limiting

`lib/rate-limit.ts` uses Upstash Redis (`@upstash/redis` + `@upstash/ratelimit`)
only when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are both set.
Otherwise a documented in-memory per-IP fallback is used. The fallback does not
persist across serverless instances or restarts — set Upstash vars in production.

## Fidelity limits (stated plainly on each tool page)

- PDF to Word: text is preserved; layout, images and tables are approximated.
- Word to PDF: headings, bold, italic and paragraphs are preserved; complex Word
  layout is simplified.
- Compress PDF: best-effort re-save with compressed object streams, not
  Ghostscript-level recompression; images are not downsampled. Input vs output
  size is reported in the UI.

## Privacy

Files are processed in memory or serverless temporary storage only, never
persisted, never publicly listed, never shared. Deleted immediately after
processing (max 60 minutes in any case). Job rows store metadata only (tool,
status, short input summary) and are deleted after 90 days (`POST /api/admin/jobs/cleanup`).

## Security

File type is validated by MIME type AND magic bytes (first bytes read directly).
Output filenames are sanitised. Every endpoint validates input with Zod.
Error responses are generic — no stack traces, secrets or internal paths.
Security headers (CSP, HSTS, X-Frame-Options DENY, nosniff, strict Referrer-Policy)
are set in `next.config.ts`. See `SECURITY_REPORT.md` for the audit.

## Architecture: shared database, per-site sessions

- **One Postgres database shared by PDF Tools Hub + AI Studio** (Neon free tier
  recommended). The same `DATABASE_URL` in both sites' Vercel projects is what
  makes the user row shared. `prisma/schema.prisma` MUST stay identical in both
  sites — do not improvise field names.
- **AUTH_SECRET is DIFFERENT per site.** Sharing one would let one site forge
  the other's tokens.
- **Honest SSO limit:** true one-login SSO across two different vercel.app
  domains is NOT possible (cookies cannot cross domains). This build gives a
  shared DB + per-site sessions. SSO on a shared domain is a later step once
  custom domains exist.
- **Sessions are JWT, not database sessions**, so the proxy (`proxy.ts` — the
  Next.js 16 renamed middleware convention) can read role/adminRole/
  totpVerifiedAt from the token with no DB round-trip. The proxy NEVER imports
  Prisma. Build succeeds with `DATABASE_URL` unset (`prisma generate` runs at
  build via postinstall; no build-time DB queries; DB pages are force-dynamic).
  Without a DB, tools work as guest tools and auth/account/admin show an honest
  "not configured" state.
- **Admin:** Google-only sign-in restricted to the `ADMIN_EMAILS` allowlist
  (first allowlisted login becomes SUPER) + mandatory TOTP 2FA (`/admin/setup-2fa`,
  `/admin/verify-2fa`, 12-hour verification window). No passwords, no fallback
  credential login — deliberately. Roles: SUPER / SUPPORT / FINANCE, enforced in
  the proxy AND in every API route. Every admin action writes an AuditLog row.
- **Payments:** Paddle Billing (merchant of record), sandbox first. Checkout is
  a server-created hosted transaction (`POST /api/checkout`, auth + age 18+
  required); the webhook (`POST /api/webhooks/paddle`) verifies the signature
  with the Paddle SDK and is idempotent via `WebhookEvent.eventId`. Card data is
  never stored. Paddle does NOT refund its fee on refunds (see Refund Policy).

## Environment variables

See `.env.example` (placeholders only — never commit real values). No secrets
are hardcoded; all configuration comes from `process.env`.

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis (optional)
- `NEXT_PUBLIC_SITE_URL` — canonical site URL (default https://pdf-tools-hub-nine-lac.vercel.app)
- `NEXT_PUBLIC_SISTER_SITE_URL` — AI Studio (default https://ai-studio-sandy-sigma.vercel.app)
- `NEXT_PUBLIC_LEADSFORCEGEN_URL` — default https://leadsforcegen.vercel.app
- `NEXT_PUBLIC_CONTACT_EMAIL` — contact form mailto fallback
- `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` — ad slot renders nothing until set; never enable ads before approval
- `NEXT_PUBLIC_PREMIUM_CHECKOUT_URL` — legacy optional checkout link; the real flow is Paddle via `/account`
- `DATABASE_URL` — shared Neon Postgres connection string (both sites, same project)
- `AUTH_SECRET` — per-site secret (different from the sister site)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth (one Cloud project can serve both sites; add both redirect URIs)
- `ADMIN_EMAILS` — comma-separated admin allowlist
- `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID`, `PADDLE_ENV` (sandbox|production)

## Owner manual steps (nothing here can be done by an agent)

1. **Neon:** create a free Neon project, run `prisma db push` (or migrate) against
   it once, paste the pooled `DATABASE_URL` into BOTH sites' Vercel projects, redeploy.
2. **Google OAuth:** create a Google Cloud OAuth client (web), add redirect URI
   `https://pdf-tools-hub-nine-lac.vercel.app/api/auth/callback/google` (plus the
   sister site's URI in the same project if sharing), paste client id/secret into
   Vercel, redeploy. OAuth works in Testing mode immediately (test users only);
   full production verification needs a custom domain you control — a vercel.app
   subdomain cannot be verified. Never claim verification is done.
3. **Admin:** set `ADMIN_EMAILS` to your Google email, sign in once (you become
   SUPER), then complete TOTP at `/admin/setup-2fa`.
4. **Paddle:** create a Paddle account, complete verification (passport as an
   individual is accepted), create a product + monthly price, set payout method
   (Payoneer or wire), add webhook endpoint
   `https://pdf-tools-hub-nine-lac.vercel.app/api/webhooks/paddle`, paste the
   sandbox keys + price id into Vercel, test with Paddle test cards, then switch
   `PADDLE_ENV` to production.
5. **AdSense:** approval is Google's decision (days to weeks); only then set the
   publisher id. Ads stay off until then, and never on sign-in/admin/account pages.
6. **Custom domain (later):** needed for full OAuth verification and for any
   future shared-domain SSO.

## Tests

```bash
npm test        # vitest: age gates, TOTP/security, file validation, Paddle signatures, settings defaults
npx playwright test  # chromium: public pages, tool pages, logged-out admin/account redirects, cookie banner, sitemap
```

## Deploy

Push to `master` on GitHub `lunnar211/pdf-tools-hub`; the Vercel project
auto-deploys. Verify live with curl afterwards (home 200, `/admin` redirecting
to `/signin` when logged out, legal pages 200, sitemap excluding private pages).
Vercel deploys/tools calls must NEVER pass `teamId` (it causes 403 on the shim).
Do not remove or overwrite existing Vercel env vars, and never create empty or
placeholder env vars in Vercel. Keep every tracked file's base64 under ~120 KB
(no large binaries, no test screenshots/videos in the repo).
