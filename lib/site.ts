export const SISTER_SITE_URL =
  process.env.NEXT_PUBLIC_SISTER_SITE_URL || "https://ai-studio-sandy-sigma.vercel.app";
export const LEADSFORCEGEN_URL =
  process.env.NEXT_PUBLIC_LEADSFORCEGEN_URL || "https://leadsforcegen.vercel.app";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pdf-tools-hub-nine-lac.vercel.app";
export const SITE_NAME = "PDF Tools Hub";

export const TOOL_SLUGS = [
  "pdf-to-word",
  "edit-pdf-text",
  "word-to-pdf",
  "image-to-pdf",
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "pdf-to-jpg",
  "rotate-pdf",
  "organize-pages",
  "watermark-pdf",
  "page-numbers",
  "ocr-pdf",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];

export type ToolFamily = "convert" | "organise" | "image";

export type ToolDef = {
  slug: ToolSlug; title: string; short: string; icon: string; family: ToolFamily;
};
export const TOOLS: ToolDef[] = [
  { slug: "pdf-to-word", title: "PDF to Word", short: "Extract the text from a PDF into an editable Word document.", icon: "file-text", family: "convert" },
  { slug: "edit-pdf-text", title: "Edit PDF text", short: "Click any line of text in a PDF and change the words, in your browser — same place, same size.", icon: "pencil", family: "organise" },
  { slug: "word-to-pdf", title: "Word to PDF", short: "Turn a Word document into a clean, shareable PDF.", icon: "file-down", family: "convert" },
  { slug: "image-to-pdf", title: "Image to PDF", short: "Combine JPG, PNG, WebP, BMP and HEIC photos into one PDF — converted in your browser.", icon: "image", family: "image" },
  { slug: "merge-pdf", title: "Merge PDF", short: "Join several PDFs into one file, in the order you choose.", icon: "combine", family: "organise" },
  { slug: "split-pdf", title: "Split PDF", short: "Pull out the pages you need as separate PDFs in a ZIP.", icon: "scissors", family: "organise" },
  { slug: "compress-pdf", title: "Compress PDF", short: "Shrink a PDF so it is easier to email and upload.", icon: "shrink", family: "organise" },
  { slug: "pdf-to-jpg", title: "PDF to JPG", short: "Turn PDF pages into JPG images, in your browser.", icon: "file-image", family: "image" },
  { slug: "rotate-pdf", title: "Rotate PDF", short: "Fix sideways or upside-down pages, in your browser.", icon: "rotate-cw", family: "organise" },
  { slug: "organize-pages", title: "Organize PDF pages", short: "Delete, reorder and rearrange pages, in your browser.", icon: "layout-grid", family: "organise" },
  { slug: "watermark-pdf", title: "Add watermark", short: "Stamp text diagonally across every page, in your browser.", icon: "droplet", family: "organise" },
  { slug: "page-numbers", title: "Add page numbers", short: "Number every page (Page X of Y), in your browser.", icon: "hash", family: "organise" },
  { slug: "ocr-pdf", title: "OCR: scanned PDF to searchable text", short: "Make scanned PDFs searchable and copyable, in your browser.", icon: "scan-text", family: "convert" },
];
