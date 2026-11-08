// Contextual next-tool suggestions shown after EVERY result — a mapping,
// not a generic list. Each entry says WHY it follows (e.g. "Shrink the PDF
// you just made" after image-to-pdf).
import type { ToolSlug } from "@/lib/site";

export type NextTool = { slug: ToolSlug; reason: string };

export const NEXT_TOOLS: Record<ToolSlug, NextTool[]> = {
  "image-to-pdf": [
    { slug: "compress-pdf", reason: "Shrink the PDF you just made for email" },
    { slug: "merge-pdf", reason: "Combine it with other PDFs" },
    { slug: "split-pdf", reason: "Split it into separate files" },
  ],
  "pdf-to-word": [
    { slug: "word-to-pdf", reason: "Turn the edited document back into a PDF" },
    { slug: "edit-pdf-text", reason: "Edit the text right in the PDF instead" },
  ],
  "edit-pdf-text": [
    { slug: "compress-pdf", reason: "Shrink the edited file for email" },
    { slug: "merge-pdf", reason: "Combine it with other PDFs" },
  ],
  "word-to-pdf": [
    { slug: "merge-pdf", reason: "Combine it with other PDFs" },
    { slug: "compress-pdf", reason: "Shrink it for email" },
  ],
  "merge-pdf": [
    { slug: "compress-pdf", reason: "Shrink the merged file" },
    { slug: "split-pdf", reason: "Split it back into parts" },
  ],
  "split-pdf": [{ slug: "merge-pdf", reason: "Recombine the parts in a new order" }],
  "compress-pdf": [{ slug: "merge-pdf", reason: "Combine the smaller file with others" }],
  "pdf-to-jpg": [{ slug: "image-to-pdf", reason: "Turn the images back into a PDF" }],
  "rotate-pdf": [
    { slug: "organize-pages", reason: "Reorder or delete pages next" },
    { slug: "compress-pdf", reason: "Shrink the fixed file" },
  ],
  "organize-pages": [
    { slug: "rotate-pdf", reason: "Fix the orientation of any page" },
    { slug: "compress-pdf", reason: "Shrink the reorganised file" },
  ],
  "watermark-pdf": [{ slug: "page-numbers", reason: "Add page numbers too" }],
  "page-numbers": [{ slug: "watermark-pdf", reason: "Add a watermark too" }],
  "ocr-pdf": [
    { slug: "pdf-to-word", reason: "Edit the recognised text as a document" },
    { slug: "edit-pdf-text", reason: "Fix the recognised text in place" },
    { slug: "compress-pdf", reason: "Shrink the searchable file" },
  ],
};
