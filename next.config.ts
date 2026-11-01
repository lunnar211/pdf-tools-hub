import type { NextConfig } from "next";

// Supabase Auth needs browser calls to the project's auth endpoint
// (sign-out + session refresh) and Google avatar images, so the public
// project host and Google's avatar host are allowlisted explicitly. If the
// Supabase project ever changes, this host must change with it. The host is
// a public project URL, not a secret.
const SUPABASE_HOST = "https://omnqidmauvloedscncir.supabase.co";

const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' allows WebAssembly compilation (OCR's tesseract core)
  // without allowing eval() for JavaScript.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self'",
  // heic2any decodes HEIC in blob workers; OCR assets are same-origin, so
  // no CDN host is needed for workers or connections.
  "worker-src 'self' blob:",
  `connect-src 'self' https://va.vercel-scripts.com ${SUPABASE_HOST}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/account/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
