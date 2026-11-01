# Compliance Checklist — PDF Tools Hub

Status key: DONE = implemented + verified in this build (build/tests/probes).
NEEDS-OWNER-ACTION = cannot be completed by an agent; the exact owner step is
given. Nothing below is claimed as done unless it was actually verified.

## Google sign-in via Supabase Auth (replaces the old Auth.js OAuth section, 2026-11-01)

| Rule | Status | Evidence / path |
|---|---|---|
| Sign-in is Google-only via Supabase Auth, minimal scopes (openid, email, profile) | DONE (code; live login NOT yet proven) | `app/signin/signin-form.tsx` (`signInWithOAuth({ provider: "google" })`), `app/auth/callback/route.ts` |
| No new Google Cloud OAuth client; reuse the existing "LeadForge" Supabase project's Google provider | DONE (by design) | README "Architecture"; no `GOOGLE_CLIENT_*` env vars anywhere in code |
| No hardcoded credentials; env-only; anon key is public by design, never committed | DONE | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `.env.example` (placeholders only) |
| Supabase redirect URL allowlisted | NEEDS-OWNER-ACTION | Owner: Supabase Dashboard → Authentication → URL Configuration → add `https://pdf-tools-hub-nine-lac.vercel.app/auth/callback` (+ `http://localhost:3000/auth/callback` for dev) |
| Vercel env vars for live login | NEEDS-OWNER-ACTION | Owner: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (pooler), `ADMIN_EMAILS`, `TOTP_ENCRYPTION_KEY` (reuse old `AUTH_SECRET` value to preserve admin TOTP setups) |
| App name, logo, privacy + terms URLs set in the provider consent screen | NEEDS-OWNER-ACTION | Owner: in the provider consent screen, set app name "PDF Tools Hub", logo, and links to `https://pdf-tools-hub-nine-lac.vercel.app/privacy` and `/terms` |
| HONEST LOGIN CAVEAT | DONE (documented) | Live Google login is NOT proven until the two owner steps above are done — never claim it works before then. Full production verification requires a verified domain the owner controls — a vercel.app subdomain CANNOT be verified. See README "Owner manual steps" §1–2 |
| Auth-identity deletion limit (honest) | DONE (documented) | No service-role key is used (anon key only, deliberately). Account delete + under-13 gate delete the Prisma profile and sign the user out, but the Supabase Auth identity itself is removed ONLY via the Supabase dashboard (owner step on user request). Stated on the account page, in the delete-route response (`supabaseIdentityRetained: true`), in `app/onboarding/actions.ts`, and here. No `SUPABASE_SERVICE_ROLE_KEY` is introduced anywhere. |

## AdSense program policies

| Rule | Status | Evidence / path |
|---|---|---|
| Original content, required pages (about, contact, privacy, terms, disclaimer, cookies, refund, acceptable-use, DMCA) | DONE | `app/about`, `app/contact`, `app/privacy`, `app/terms`, `app/disclaimer`, `app/cookies`, `app/refund-policy`, `app/acceptable-use`, `app/dmca` |
| Ads render ONLY after cookie consent | DONE | `components/ad-slot.tsx` (consent + publisher id + admin ads toggle all required) |
| No ads on login/admin/account/empty pages | DONE | AdSlot is placed only on the public home page; `/signin`, `/admin`, `/account` never render it |
| Ad slot env-gated, OFF until approval | DONE | `components/ad-slot.tsx` returns null without `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` |
| AdSense approval itself | NEEDS-OWNER-ACTION | Google's decision (days to weeks); only then set the publisher id in Vercel |

## Paddle business rules

| Rule | Status | Evidence / path |
|---|---|---|
| Paddle Billing is merchant of record; 5% + $0.50 fee | DONE (implemented per verdict) | `lib/paddle.ts`, `app/api/checkout/route.ts`, `app/api/webhooks/paddle/route.ts` |
| Payouts monthly (balance over $100 on the 1st, sent by the 15th, up to 3 working days) via wire or Payoneer; Nepal not on the unsupported list | DONE (documented for owner) | README "Owner manual steps" §4; no code change needed |
| FX margin up to 1.5%; possible $15 SWIFT fee | DONE (documented) | `app/refund-policy/page.tsx` + README |
| Paddle does NOT refund its fee on refunds | DONE (stated) | `app/refund-policy/page.tsx`, `app/admin/money/page.tsx` |
| No card data stored; only customer/plan/status/invoice/transaction ids | DONE | `app/api/webhooks/paddle/route.ts`, `prisma/schema.prisma` (Payment/Subscription models) |
| Webhook signature verified + idempotent (duplicate event id → 200 ignored) | DONE (code + SDK unit tests) | `app/api/webhooks/paddle/route.ts`, `tests/unit/paddle.test.ts` |
| Sandbox test with test cards + sandbox webhook | NEEDS-OWNER-ACTION | Owner: Paddle account → verification (passport as individual) → product + monthly price → payout method (Payoneer/wire) → webhook endpoint `https://pdf-tools-hub-nine-lac.vercel.app/api/webhooks/paddle` → sandbox keys + price id in Vercel → test → switch `PADDLE_ENV` to production |
| Stripe NOT used (Nepal unsupported; would need a foreign entity) | DONE (not implemented) | — |
| Lemon Squeezy NOT implemented (backup only; Nepal bank-payout membership unconfirmed, PayPal Nepal send-only, Stripe-migration risk) | DONE (not implemented) | — |
| eSewa/Khalti NOT implemented (local NPR only, need Nepalese merchant onboarding; future option) | DONE (not implemented) | — |

## Vercel fair use

| Rule | Status | Evidence / path |
|---|---|---|
| No abuse of serverless limits; tools are stateless, files never persisted | DONE | Tool routes stream conversions; no background jobs beyond admin cleanup |
| Deploys without teamId; no existing env vars touched; no empty/placeholder env vars created | DONE | Deploy is GitHub auto-deploy; this build created zero Vercel env vars |
| Tracked files small (no large binaries, no test screenshots/videos) | DONE with one documented exception | `SECURITY_REPORT.md` note on `package-lock.json` (GitHub deploy path, not the upload shim) |

## Nepal Privacy Act 2018 + Electronic Transactions Act

| Rule | Status | Evidence / path |
|---|---|---|
| Data rights (export + delete) on the account page | DONE | `app/account/page.tsx`, `app/api/account/export/route.ts`, `app/api/account/delete/route.ts` |
| Privacy policy states Nepal Acts alignment (not legal advice) | DONE | `app/privacy/page.tsx` |
| No ID documents collected; self-declaration only; data minimization (hashed IPs, metadata-only jobs, 90-day job retention) | DONE | `app/onboarding/`, `lib/security.ts`, `lib/jobs.ts`, `app/api/admin/jobs/cleanup/route.ts` |

## Age thresholds (why each exists)

| Threshold | Rule | Basis |
|---|---|---|
| Under 13 | Blocked entirely, site account deleted, NO site data kept (Supabase Auth identity itself removed only via dashboard — see the Auth-identity limit row above) | COPPA + GDPR-K lower bound |
| 13–15 | Account cannot be activated (blocked message, SUSPENDED) | Below the digital-consent age |
| 16–17 | Free account only, paid checkout blocked | GDPR default digital-consent age is 16; Nepal's Privacy Act 2018 sets no fixed digital-consent age, so 16 is the conservative alignment |
| 18+ | Paid plans allowed | Contractual capacity |

Implemented in `lib/age.ts` (unit-tested), `app/onboarding/actions.ts`,
`app/api/checkout/route.ts`.

## Content moderation (honest scope)

| Rule | Status | Evidence / path |
|---|---|---|
| Upload moderation = MIME + magic-byte + size checks, abuse controls, flagged-upload metadata view | DONE | `lib/files.ts`, `lib/tool-gate.ts`, `app/admin/usage/page.tsx` |
| NO prompt moderation claimed (this site has no prompts, no AI) | DONE (explicitly disclaimed) | `app/acceptable-use/page.tsx`, `app/privacy/page.tsx` |

## Shared schema discipline

| Rule | Status | Evidence / path |
|---|---|---|
| `prisma/schema.prisma` follows the coordinator's spec verbatim (models, enums, fields) | DONE | `prisma/schema.prisma` |
| Supabase switch schema diff = ONLY additive `User.supabaseId String? @unique` (no renames, no other field changes) | DONE | `prisma/schema.prisma` (User model); legacy Auth.js `Account`/`Session`/`VerificationToken` tables retained untouched for compatibility, unused under Supabase |
| File database-compatible in the sister site | NEEDS-OWNER-ACTION (coordination) | The sister-site builder owns its copy; both must be diffed before the shared DB goes live, and the schema is pushed ONCE from either repo. |
| TOTP_ENCRYPTION_KEY set per site (replaces AUTH_SECRET for TOTP/IP purposes); DATABASE_URL shared (Supabase pooler) | DONE (documented + enforced by guidance) | README "Architecture", `.env.example` |
| True cross-domain SSO honestly NOT claimed (cookies cannot cross vercel.app domains) | DONE (documented) | README "Architecture" |

## Addendum 2026-11-01 — browser-tools improvement

| Rule | Status | Evidence / path |
|---|---|---|
| Browser tools never upload files (privacy claim matches code) | DONE | `components/image-to-pdf-tool.tsx`, `lib/pdf-client.ts`, `lib/ocr.ts` (dynamic imports, no fetch of file bytes) |
| Server fallback files memory-only, never stored | DONE | `app/api/image-to-pdf/route.ts` (buffer-only); no `fs` writes in any route |
| Rate limits apply to browser tools, not just server routes | DONE | `app/api/usage/count/route.ts`, `lib/usage.ts` |
| No invented prices on pricing page (price shown at Paddle checkout) | DONE | `app/pricing/page.tsx` (quotas from SiteSetting; no price numbers) |
| No fake password protection / unlock | DONE (explicitly declined) | Homepage FAQ, OCR tool page note, README "Browser tools" |
| OCR: no file leaves the device; assets vendored same-origin, no CDN | DONE | `public/tesseract/*`, `lib/ocr.ts` |
| Conversion history is on-device only (1h), server stays metadata-only | DONE | `lib/history.ts`, `components/local-history.tsx` |
| `public/tesseract/*` (~23 MB) exceeds the 120 KB shim-file guideline | DOCUMENTED EXCEPTION | README "Deploy": safe only because this repo deploys via GitHub auto-deploy, never the base64 CLI shim |
