import type { MetadataRoute } from "next";
import { SITE_URL, TOOLS } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "about", "contact", "privacy", "terms", "disclaimer", ...TOOLS.map((t) => t.slug)];
  return pages.map((p) => ({ url: `${SITE_URL}/${p}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 }));
}
