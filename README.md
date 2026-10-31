# PDF Tools Hub

Free, everyday PDF tools built with Next.js (App Router), TypeScript and Tailwind CSS:
PDF to Word, Word to PDF, Image to PDF, Merge PDF, Split PDF and Compress PDF.

## Run locally

```bash
npm install
npm run dev
```

## Free tier

20 conversions per day per IP. PDFs up to 25 MB; images up to 10 MB each (max 20 per request).

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
processing (max 60 minutes in any case).

## Security

File type is validated by MIME type AND magic bytes (first bytes read directly).
Output filenames are sanitised. Every endpoint validates input with Zod.
Error responses are generic — no stack traces, secrets or internal paths.
Security headers (CSP, HSTS, X-Frame-Options DENY, nosniff, strict Referrer-Policy)
are set in `next.config.ts`.

## Environment variables

See `.env.example`. No secrets are hardcoded; all configuration comes from
`process.env`. Public (`NEXT_PUBLIC_`) vars are site URLs, contact email,
AdSense publisher ID and premium checkout URL only — never secrets.

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Upstash Redis (optional)
- `NEXT_PUBLIC_SITE_URL` — canonical site URL for sitemap/SEO (default https://pdf-tools-hub.vercel.app)
- `NEXT_PUBLIC_SISTER_SITE_URL` — AI Studio URL (default https://ai-studio.vercel.app; coordinator corrects via env + rebuild)
- `NEXT_PUBLIC_LEADSFORCEGEN_URL` — default https://leadsforcegen.vercel.app
- `NEXT_PUBLIC_CONTACT_EMAIL` — contact form mailto target; form is disabled with an honest notice when unset
- `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID` — ad slot renders nothing until set; never enable ads before approval
- `NEXT_PUBLIC_PREMIUM_CHECKOUT_URL` — premium button renders nothing actionable until set; no payment flow is implemented and no payment details are collected

## Deploy

Deployment is owned by the project coordinator. This repo is not deployed from here.
