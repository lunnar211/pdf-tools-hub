# CHANGELOG — PDF Tools Hub

## supabase-dashboard (branch, not merged)

- **One admin identity (same as LeadsForceGen).** Admin access on every site is
  the same admin email via ADMIN_EMAILS + Google sign-in (primary) + mandatory
  TOTP 2FA for /admin. NEW: email + password sign-in is now offered alongside
  Google via Supabase Auth (`signInWithPassword`). The admin account itself
  must be created by the owner in the Supabase dashboard (Authentication →
  Add user) with a fresh password never shared in chat, and the Email provider
  must be enabled there by him. No password from chat history is ever used,
  stored, or put in any file. Errors are deliberately generic (wrong password,
  unknown email, and disabled Email provider all show the same message).
- **Full admin panel.** The existing overview (live counts), Users (search,
  role/plan/status, suspend/unsuspend, plan change, delete with confirmation),
  Money (live Paddle orders + revenue totals), Usage, Settings (limits, tool
  kill-switches, banner, ads, API budget cap), Support inbox, and audit Logs
  pages were verified live-data-only. NEW: a read-only **Database overview**
  page (row counts for every shared table + recent jobs/users/actions/errors;
  no edits, no deletes, no SQL console, no sensitive columns selected) and a
  **Tokens & providers** page (status by NAME only — Set/Not set booleans,
  never any key/token/secret value; spend cap + maintenance + disabled-tool
  kill-switches shown with a link to Settings for edits). Admin role gating
  is enforced server-side on every admin page and every admin API route.
  Note: PDF Tools Hub has no manual-payment-proof flow (Paddle only), so no
  approve/reject queue was invented for it.
- **Professional redesign (design system, not a rebrand).** The site already
  matched the researched flat SaaS direction (teal #0d9488 + orange #ea580c,
  Plus Jakarta Sans), so the work systematized it instead of changing the
  look: documented tokens + rules at the top of `app/globals.css`, consistent
  form-control base styles (44px touch targets, layered so per-page Tailwind
  classes still win), pointer cursor on clickable buttons, selection colour,
  the existing visible orange focus ring and reduced-motion support kept.
  Home, pricing, and tool pages keep their URLs and honest copy; pricing
  still shows no invented price (price lives at the Paddle checkout).
- **Tests.** New Playwright mobile spec: 360px pages (home, pricing, tool,
  sign-in) have no horizontal overflow; keyboard focus moves through home
  navigation; sign-in email form is keyboard reachable (or the page honestly
  shows not-configured); admin database/providers pages redirect to sign-in
  when logged out.

- **Same-database dashboard wiring (no new database).** PDF Tools Hub now has a
  signed-in `/dashboard` route mirroring LeadsForceGen's `/dashboard`, reading
  live data only from the owner's existing Supabase "LeadForge" project via the
  shared Prisma schema: profile (name/email/plan from the Supabase Auth identity
  + Prisma User row), conversions used today vs the plan quota, and the 10 most
  recent Job rows, plus quick tool links and a link to `/account` for data
  management. No demo, hardcoded, or placeholder numbers anywhere on the page.
- **Auth gating.** `/dashboard` is gated by the same Supabase-session proxy
  rule as `/account` (signed-out visitors redirect to `/signin`); the page
  itself re-checks the session server-side and redirects to `/signin` when
  there is none. When the database is not configured, the page shows an honest
  "not configured yet" banner instead of numbers; when the database is set but
  the profile cannot load, it says the data is unavailable right now.
- **Privacy.** `/dashboard` is excluded from the sitemap (private pages are
  never listed) and added to `robots.txt` disallow, and its metadata sets
  `robots: index false`. A Dashboard link appears in the navbar only while
  signed in, next to Account.
- **Schema compatibility (read-only comparison vs ai-studio).** All shared
  Prisma models and enums have identical columns in both repos. Drift found
  (no code change made for it): ai-studio alone adds the LogoGeneration,
  AiUsageLog, and PhotoJob tables, and PDF Tools Hub's Job model carries two
  extra indexes. Consequence: the ONE schema push must come from ai-studio
  (the superset); PDF Tools Hub must never push its schema afterward, or the
  push would treat the ai-studio-only tables as removed. This agent ran no
  `prisma db push`.
- **Tests.** New Playwright checks: `/dashboard` redirects to `/signin` when
  logged out, and the sitemap excludes `/dashboard`.
