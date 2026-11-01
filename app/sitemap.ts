import type { MetadataRoute } from "next";
import { SITE_URL, TOOLS } from "@/lib/site";
import { GUIDES } from "@/lib/guides";
import { LANDINGS } from "@/lib/landings";
// Public pages ONLY. /admin, /account, /signin, and /onboarding are excluded
// on purpose (private pages must not be indexed).
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "", "about", "contact", "privacy", "terms", "disclaimer", "cookies",
    "refund-policy", "acceptable-use", "dmca", "pricing", "guides",
    ...TOOLS.map((t) => t.slug),
    ...GUIDES.map((g) => `guides/${g.slug}`),
    ...LANDINGS.map((l) => l.slug),
  ];
  return pages.map((p) => ({ url: `${SITE_URL}/${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));
}
