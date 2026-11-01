# CHANGELOG — PDF Tools Hub

## supabase-dashboard (branch, not merged)

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
