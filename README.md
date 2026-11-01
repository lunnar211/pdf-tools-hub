# PDF Tools Hub

Free, everyday PDF tools built with Next.js 16.4.3 (App Router), TypeScript and Tailwind CSS:
PDF to Word, Word to PDF, Image to PDF, Merge PDF, Split PDF and Compress PDF,
plus browser-first tools: PDF to JPG, Rotate PDF, Organize pages, Add watermark,
Add page numbers, and OCR (scanned PDF to searchable text). Plus: Google sign-in
(Supabase Auth on the owner's existing "LeadForge" Supabase project, no separate
OAuth client), an admin panel with TOTP 2FA, onboarding with age gates, and
Paddle Billing for Premium.

Live: https://pdf-tools-hub-nine-lac.vercel.app
(Vercel project `pdf-tools-hub`, GitHub `lunnar211/pdf-tools-hub`, auto-deploys from `master`.
Note: `https://pdf-tools-hub.vercel.app` is a DIFFERENT app — do not use it for this repo.)

## Run locally

```bash
npm install
npm run dev
```

## Browser tools (convert on your device)

Image to PDF, PDF to JPG, Rotate PDF, Organize pages, Add watermark, Add page
numbers, and OCR run entirely in the browser (pdf-lib / pdf.js / Tesseract.js
via dynamic imports, so the initial bundle stays small). Files never leave the
device. Server fallback exists ONLY for JPG/PNG files the browser cannot decode
(via the existing `/api/image-to-pdf` route, in-memory processing).

- **Usage counter:** `GET /api/usage/remaining` reads the real limit without
  consuming (guest per-IP / signed-in plan quota); `POST /api/usage/count`
  runs the full tool gate and consumes one unit, so browser conversions count
  against the same limits as server conversions. The homepage/tool counters
  show these numbers, never hardcoded values.
- **Conversion history:** outputs are saved to IndexedDB on the user's own
  device for 1-hour re-download (`/account` → "Recent conversions"). Server Job
  rows stay metadata-only — the server never holds file contents, so history
  works per-device only, by design.
- **OCR is fully self-contained:** the Tesseract worker, core wasm variants
  (relaxed-SIMD / SIMD / plain LSTM, picked by browser capability), and the
  English traineddata live under `public/tesseract/` — nothing loads from a
  CDN. English only, first 10 pages. CSP allows `worker-src 'self' blob:`
  (heic2any blob workers) and `'wasm-unsafe-eval'` (wasm compilation only,
  not JS eval).
- **NOT built, deliberately:** password protection / unlock for PDFs.
  pdf-lib cannot encrypt PDFs (or open encrypted ones), and no sound
  serverless encryption library exists, so no fake lock is shipped. The same
  honesty rule applies to the pricing page: no price is invented — the price
  is shown at the Paddle checkout.

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

Server tools process files in memory only — nothing is ever written to disk
(verified: no `fs` writes in any route), never persisted, never publicly
listed, never shared. Browser tools never upload files at all. Job rows store
metadata only (tool, status, short input summary) and are deleted after 90
days (`POST /api/admin/jobs/cleanup`). On-device history expires after 1 hour.

## Security

File type is validated by MIME type AND magic bytes (first bytes read directly),
on client AND server (client checks are fast feedback; server checks are the
real gate). Output filenames are sanitised. Every endpoint validates input with Zod.
Error responses are generic — no stack traces, secrets or internal paths — while
server failures are now also written to the `ErrorLog` table (best-effort, via
`lib/admin.ts` `logError`) so `/admin/logs` shows real entries.
Security headers (CSP, HSTS, X-Frame-Options DENY, nosniff, strict Referrer-Policy)
are set in `next.config.ts`. See `SECURITY_REPORT.md` for the audit.

## Architecture: shared database, per-site sessions (Supabase Auth)

- **Auth = Supabase Auth (Google provider) on the owner's EXISTING Supabase
  project "LeadForge"** (`https://omnqidmauvloedscncir.supabase.co`). The
  Google provider is already configured there — do NOT create a new Google
  Cloud OAuth client, and do NOT add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  env vars. Sign-in is `supabase.auth.signInWithOAuth({ provider: "google" })`
  redirecting to this site's own `/auth/callback`, which exchanges the code
  for a session and validates the `next` redirect (relative paths only —
  see `lib/redirect.ts`; absolute/external `next` values are rejected).
- **One Postgres database shared by PDF Tools Hub + AI Studio** (the same
  Supabase project, via its pooler `DATABASE_URL`). The same `DATABASE_URL`
  in both sites' Vercel projects is what makes the user row shared.
  `prisma/schema.prisma` MUST stay database-compatible in both sites — do not
  rename models, tables, columns, or primary keys, and do not change other
  models' fields. The ONLY schema change of the Supabase switch is the
  additive `User.supabaseId String? @unique`, which maps a Supabase Auth user
  to its Prisma row (first-login upsert in `/auth/callback`, by supabaseId
  then email; lazy upsert in `lib/supabase/server.ts` if the callback ran
  while the DB was down). The schema is pushed ONCE from either repo.
  The old `Account`/`Session`/`VerificationToken` tables are legacy Auth.js
  tables, retained untouched for compatibility and unused under Supabase.
- **No service-role key.** Only the public anon key is used (`NEXT_PUBLIC_`
  vars), from browser and server alike. Consequence, stated honestly: fully
  deleting a Supabase Auth identity needs the service-role key or a dashboard
  deletion — the site deletes the Prisma profile (account delete, under-13
  age gate) and signs the user out, but the Auth identity itself is removed
  only via the Supabase dashboard. See `COMPLIANCE_CHECKLIST.md`.
- **Honest SSO limit:** true one-login SSO across two different vercel.app
  domains is NOT possible (cookies cannot cross domains). This build gives a
  shared DB + per-site sessions. SSO on a shared domain is a later step once
  custom domains exist.
- **Sessions are Supabase cookies** (managed by `@supabase/ssr`), refreshed by
  the proxy (`proxy.ts` — the Next.js 16 renamed middleware convention).
  The proxy NEVER imports Prisma: it checks the Supabase session + the signed
  TOTP cookie only, and every page/API route re-checks role, TOTP, age, and
  suspension server-side. Build succeeds with `DATABASE_URL` unset (`prisma
  generate` runs at build via postinstall; no build-time DB queries; DB pages
  are force-dynamic). Without a DB, tools work as guest tools and
  auth/account/admin show an honest "not configured" state.
- **Admin:** Google-only sign-in restricted to the `ADMIN_EMAILS` allowlist
  (first allowlisted login becomes SUPER) + mandatory custom TOTP 2FA
  (`/admin/setup-2fa`, `/admin/verify-2fa`, 12-hour verification window,
  server-checked on every `/admin` page and API route via a signed httpOnly
  cookie — see `lib/totp-session.ts`). Supabase's built-in MFA was NOT used:
  it would add a second authenticator enrolment on the Auth user for a step
  only admins take, while the custom TOTP was already built and tested.
  No passwords, no fallback credential login — deliberately. Roles: SUPER /
  SUPPORT / FINANCE, enforced in the proxy AND in every API route. Every admin
  action writes an AuditLog row.
- **Admin TOTP secret key:** `TOTP_ENCRYPTION_KEY` (server-only, never
  `NEXT_PUBLIC_`). It replaces the old Auth.js `AUTH_SECRET` for TOTP-secret
  encryption and IP-hash salt. If the owner reuses the old `AUTH_SECRET`
  value as `TOTP_ENCRYPTION_KEY`, existing admin TOTP setups keep working;
  otherwise admins re-run `/admin/setup-2fa`. The code still accepts a legacy
  `AUTH_SECRET` as a fallback for that migration, but new deployments set
  only `TOTP_ENCRYPTION_KEY`.
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
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (LeadForge project; public, not a secret)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key (public by design; never commit a real value — placeholders only in docs)
- `DATABASE_URL` — shared Supabase Postgres pooler connection string (both sites, same project)
- `TOTP_ENCRYPTION_KEY` — server-only key for admin TOTP-secret encryption + IP-hash salt (generate with `openssl rand -base64 32`; reuse the old `AUTH_SECRET` value here to preserve existing admin TOTP setups)
- `ADMIN_EMAILS` — comma-separated admin allowlist
- `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_ID`, `PADDLE_ENV` (sandbox|production)

## Owner manual steps (nothing here can be done by an agent)

1. **Supabase (existing "LeadForge" project — no new project, no new OAuth
   client):** in Supabase Dashboard → Authentication → URL Configuration, add
   Site URL `https://pdf-tools-hub-nine-lac.vercel.app` and Redirect URL
   `https://pdf-tools-hub-nine-lac.vercel.app/auth/callback` (plus
   `http://localhost:3000/auth/callback` for local dev, and the sister site's
   callback if sharing the project). Run `prisma db push` (or migrate) against
   the project's pooler database ONCE from either repo, paste the pooler
   `DATABASE_URL` into BOTH sites' Vercel projects, redeploy. Live Google
   login is NOT proven until these taps + the Vercel env vars below are done
   — do not claim it works before then.
2. **Vercel env vars (this site):** `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase Dashboard → Settings → API),
   `DATABASE_URL` (pooler string), `ADMIN_EMAILS`,
   `TOTP_ENCRYPTION_KEY` (new; reuse the old `AUTH_SECRET` value to preserve
   existing admin TOTP setups), plus unchanged `PADDLE_*`. Do NOT set
   `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `AUTH_SECRET` for this site
   any more (Auth.js is removed; `AUTH_SECRET` is only a legacy fallback read
   by the code during migration).
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
npm test        # vitest (51 tests): age gates, TOTP/security, file validation, Paddle signatures, settings defaults, redirect validation, TOTP-cookie signing, magic-byte detection incl. WebP/BMP/HEIC, image-PDF page-size/layout/estimate math, next-tool mapping, IndexedDB history + expiry
npx playwright test  # chromium (25 tests): public pages, tool pages, logged-out admin/account redirects, cookie banner, sitemap, unauthenticated auth-surface + callback open-redirect rejection, browser image-to-PDF conversion incl. EXIF rotation + per-file errors, merge (server), pdf-to-jpg, rotate, organize, watermark, page numbers, usage-counter API, pricing/guides/landing pages, OCR end-to-end
```

## Deploy

Push to `master` on GitHub `lunnar211/pdf-tools-hub`; the Vercel project
auto-deploys. Verify live with curl afterwards (home 200, `/admin` redirecting
to `/signin` when logged out, legal pages 200, sitemap excluding private pages).
Vercel deploys/tools calls must NEVER pass `teamId` (it causes 403 on the shim).
Do not remove or overwrite existing Vercel env vars, and never create empty or
placeholder env vars in Vercel. Keep every tracked file's base64 under ~120 KB
(no large binaries, no test screenshots/videos in the repo) — with ONE
documented exception: `public/tesseract/*` (the vendored OCR engine, ~23 MB
total: worker + 3 core wasm variants + English traineddata). That exception is
safe ONLY because this repo deploys via GitHub auto-deploy, never the base64
CLI shim; do not copy large binaries into any shim-deployed repo.
