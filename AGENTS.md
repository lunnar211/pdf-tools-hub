<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version (16.4.3) has breaking changes — APIs, conventions, and file structure may all differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory) before writing any code. Heed deprecation notices.

## Next.js 16 rules applied in this repo

- **Middleware is now proxy:** auth gating lives in `proxy.ts` (exported function
  `proxy`, Node.js runtime), NOT `middleware.ts`. The proxy is JWT-only and must
  NEVER import Prisma or any DB code — role/adminRole/totpVerifiedAt come from
  the Auth.js JWT, decoded with `@auth/core/jwt`.
- **Request APIs are async only** (`cookies()`, `headers()`, `params`,
  `searchParams`); never use sync access.
- **`next lint` is removed** — the `lint` script calls the ESLint CLI directly.
- **Prisma engines in this sandbox:** Node's fetch through the egress proxy
  resets connections to `binaries.prisma.sh`, while curl works. If
  `prisma generate` fails with ECONNRESET here, download the engines with curl
  into `~/.cache/prisma/master/<commit>/debian-openssl-3.0.x/` using the LOGICAL
  cache names (`schema-engine`, `libquery-engine`) plus matching `.sha256` files
  (hash only, no trailing newline), and copy them into
  `node_modules/@prisma/engines/` with their suffixed names. On Vercel's network
  the normal download works.
- **Deploy size limit:** keep every tracked file's base64 under ~120 KB.
- **Vercel tooling:** NEVER pass `teamId` (403). Do not touch existing env vars.

<!-- END:nextjs-agent-rules -->
