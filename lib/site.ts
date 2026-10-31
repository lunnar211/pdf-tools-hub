export const SISTER_SITE_URL =
  process.env.NEXT_PUBLIC_SISTER_SITE_URL || "https://ai-studio.vercel.app";
export const LEADSFORCEGEN_URL =
  process.env.NEXT_PUBLIC_LEADSFORCEGEN_URL || "https://leadsforcegen.vercel.app";
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pdf-tools-hub.vercel.app";
export const SITE_NAME = "PDF Tools Hub";

export type ToolDef = {
  slug: string; title: string; short: string; icon: string;
};
export const TOOLS: ToolDef[] = [
  { slug: "pdf-to-word", title: "PDF to Word", short: "Extract the text from a PDF into an editable Word document.", icon: "file-text" },
  { slug: "word-to-pdf", title: "Word to PDF", short: "Turn a Word document into a clean, shareable PDF.", icon: "file-down" },
  { slug: "image-to-pdf", title: "Image to PDF", short: "Combine JPG and PNG photos into one A4 PDF.", icon: "image" },
  { slug: "merge-pdf", title: "Merge PDF", short: "Join several PDFs into one file, in the order you choose.", icon: "combine" },
  { slug: "split-pdf", title: "Split PDF", short: "Pull out the pages you need as separate PDFs in a ZIP.", icon: "scissors" },
  { slug: "compress-pdf", title: "Compress PDF", short: "Shrink a PDF so it is easier to email and upload.", icon: "shrink" },
];
