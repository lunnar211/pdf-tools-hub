// Generate Open Graph images (1200x630 JPEG) by screenshotting a small HTML
// template with Playwright's bundled Chromium. No server route needed:
// page.setContent renders the template directly.
// Usage: node scripts/og-images.mjs
// Output: public/og/<slug>.jpg (kept small: simple flat graphics, q80).
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "og");

const PAGES = [
  { slug: "default", title: "PDF Tools Hub", subtitle: "Free PDF tools, in your browser. No account needed." },
  { slug: "pdf-to-word", title: "PDF to Word", subtitle: "Turn a PDF into an editable Word document." },
  { slug: "word-to-pdf", title: "Word to PDF", subtitle: "Turn a Word document into a clean PDF." },
  { slug: "image-to-pdf", title: "Image to PDF", subtitle: "Combine photos into one PDF — in your browser." },
  { slug: "merge-pdf", title: "Merge PDF", subtitle: "Join several PDFs into one file." },
  { slug: "split-pdf", title: "Split PDF", subtitle: "Pull out the pages you need." },
  { slug: "compress-pdf", title: "Compress PDF", subtitle: "Shrink a PDF for email and uploads." },
  { slug: "pdf-to-jpg", title: "PDF to JPG", subtitle: "Turn PDF pages into JPG images." },
  { slug: "rotate-pdf", title: "Rotate PDF", subtitle: "Fix sideways or upside-down pages." },
  { slug: "organize-pages", title: "Organize PDF pages", subtitle: "Delete and reorder pages." },
  { slug: "watermark-pdf", title: "Add watermark", subtitle: "Stamp text across every page." },
  { slug: "page-numbers", title: "Add page numbers", subtitle: "Number every page: Page X of Y." },
  { slug: "ocr-pdf", title: "OCR: scanned PDF to searchable text", subtitle: "Make scanned PDFs searchable, in your browser." },
  { slug: "jpg-to-pdf", title: "JPG to PDF", subtitle: "Convert JPG images to PDF, free." },
  { slug: "photos-to-pdf-on-phone", title: "Photos to PDF on your phone", subtitle: "No app needed — capture and convert." },
  { slug: "combine-images-into-one-pdf", title: "Combine images into one PDF", subtitle: "One PDF from many pictures." },
  { slug: "scan-to-pdf-free", title: "Scan to PDF, free", subtitle: "From phone photos or scanned pages." },
  { slug: "guides", title: "Guides", subtitle: "Short, practical guides for everyday PDF jobs." },
  { slug: "pricing", title: "Pricing: Free vs Premium", subtitle: "Free for everyday use. Premium for heavy use." },
];

function template(p) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;box-sizing:border-box}
    body{width:1200px;height:630px;background:#0f766e;font-family:Arial,Helvetica,sans-serif;color:#fff;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;color:#0f172a;border-radius:28px;width:1040px;padding:64px 72px}
    .brand{font-size:26px;font-weight:700;color:#0d9488;letter-spacing:1px;text-transform:uppercase}
    h1{font-size:64px;line-height:1.05;margin-top:18px}
    p{font-size:30px;color:#475569;margin-top:20px;line-height:1.3}
    .foot{margin-top:28px;font-size:22px;color:#94a3b8}
  </style></head><body><div class="card">
    <div class="brand">PDF Tools Hub</div>
    <h1>${esc(p.title)}</h1>
    <p>${esc(p.subtitle)}</p>
    <div class="foot">pdf-tools-hub-nine-lac.vercel.app</div>
  </div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
mkdirSync(outDir, { recursive: true });
for (const p of PAGES) {
  await page.setContent(template(p));
  await page.screenshot({ path: join(outDir, `${p.slug}.jpg`), type: "jpeg", quality: 80 });
  console.log(`wrote public/og/${p.slug}.jpg`);
}
await browser.close();
console.log("done");
