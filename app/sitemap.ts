import type { MetadataRoute } from "next";
import { SITE_URL, TOOLS } from "@/lib/site";
// Public pages ONLY. /admin, /account, /signin, and /onboarding are excluded
// on purpose (private pages must not be indexed).
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "", "about", "contact", "privacy", "terms", "disclaimer", "cookies",
    "refund-policy", "acceptable-use", "dmca", ...TOOLS.map((t) => t.slug),
  ];
  return pages.map((p) => ({ url: `${SITE_URL}/${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));
}
