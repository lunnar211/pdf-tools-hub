export type ToolContent = {
  slug: string; title: string; description: string; meta: string;
  accept: string; multiple: boolean; fieldName: string; endpoint: string; resultLabel: string;
  howTo: string[]; useCases: string[]; faqs: { q: string; a: string }[]; note: string; limits: string;
};
export const TOOL_CONTENT: Record<string, ToolContent> = {
  "pdf-to-word": {
    slug: "pdf-to-word", title: "PDF to Word", meta: "Convert a PDF into an editable Word document, free. Text is preserved; layout is approximated.",
    description: "Turn a PDF back into a document you can edit. Upload a PDF and get a real .docx file with its text organised into paragraphs and headings, ready to open in Word or Google Docs.",
    accept: ".pdf,application/pdf", multiple: false, fieldName: "file", endpoint: "/api/pdf-to-word", resultLabel: "Your Word document",
    howTo: ["Upload your PDF file (up to 25 MB).", "Click Convert and wait for the text extraction to finish.", "Download the .docx file and edit it in Word or Google Docs."],
    useCases: ["Editing a contract or report that only exists as a PDF", "Reusing text from a scanned-free PDF in a new document", "Fixing a typo in a PDF without retyping the whole page"],
    faqs: [
      { q: "Will the Word file look exactly like the PDF?", a: "No. Text is preserved, and larger text becomes headings, but page layout, images and tables are approximated. Treat the result as an editable draft, not a pixel-perfect copy." },
      { q: "What about scanned PDFs?", a: "Scanned pages are pictures of text, not real text, so this tool cannot extract them. It works on PDFs with a real text layer, which most exported PDFs have." },
      { q: "Is there a page or size limit?", a: "Files up to 25 MB are accepted on the free tier, with 20 conversions per day per visitor." },
    ],
    note: "Fidelity limit: layout, images and tables are approximated; text is preserved.",
    limits: "PDF up to 25 MB. Free tier: 20 conversions per day.",
  },
  "word-to-pdf": {
    slug: "word-to-pdf", title: "Word to PDF", meta: "Convert a Word document to PDF free. Headings, bold and italic text are kept; complex layout is simplified.",
    description: "Share a Word document without worrying that fonts or formatting will shift on someone else's computer. This tool reads your .docx file and renders a clean PDF from its headings, paragraphs, bold and italic text.",
    accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", multiple: false, fieldName: "file", endpoint: "/api/word-to-pdf", resultLabel: "Your PDF",
    howTo: ["Upload your .docx file (up to 25 MB).", "Click Convert.", "Download the PDF and share it anywhere — it will look the same on every device."],
    useCases: ["Sending a CV or application that must not be edited by the reader", "Submitting an assignment or report in a fixed format", "Archiving a document exactly as it reads today"],
    faqs: [
      { q: "Will complex Word layout survive?", a: "No. Complex layout — multi-column text, text boxes, floating images and intricate tables — is simplified. Headings, paragraphs, bold and italic text are kept." },
      { q: "Can I convert an old .doc file?", a: "Only .docx files are supported. Open an old .doc in Word or Google Docs and save it as .docx first." },
      { q: "Why is my PDF text smaller than expected?", a: "Long lines are wrapped to fit an A4 page with comfortable margins, so very wide content reflows rather than being cut off." },
    ],
    note: "Fidelity limit: complex Word layout is simplified; headings, bold, italic and paragraphs are preserved.",
    limits: "Word (.docx) up to 25 MB. Free tier: 20 conversions per day.",
  },
  "image-to-pdf": {
    slug: "image-to-pdf", title: "Image to PDF", meta: "Combine JPG and PNG photos into one A4 PDF, free. One page per image, up to 20 images.",
    description: "Turn photos or scanned pages into a single PDF. Each image gets its own A4 page, scaled to fit without cropping, so a set of photos becomes one file you can email, print or upload to a form.",
    accept: ".jpg,.jpeg,.png,image/jpeg,image/png", multiple: true, fieldName: "files", endpoint: "/api/image-to-pdf", resultLabel: "Your PDF",
    howTo: ["Upload up to 20 JPG or PNG images, in the order you want them.", "Click Convert.", "Download one PDF with one page per image."],
    useCases: ["Turning phone photos of receipts into a single expense PDF", "Combining scanned ID or certificate pages for an application form", "Making a printable photo sheet from several pictures"],
    faqs: [
      { q: "Are images cropped?", a: "No. Each image is scaled to fit an A4 page while keeping its proportions, so nothing is cut off." },
      { q: "What order do the pages come in?", a: "The order you select the files in. If the order matters, rename files so they sort the way you want before uploading." },
      { q: "How large can each image be?", a: "Up to 10 MB per image, with a maximum of 20 images per conversion." },
    ],
    note: "Each image becomes one A4 page, fitted without cropping.",
    limits: "Images up to 10 MB each, max 20 per request. Free tier: 20 conversions per day.",
  },
  "merge-pdf": {
    slug: "merge-pdf", title: "Merge PDF", meta: "Merge several PDFs into one file free, in the order you choose. Each file up to 25 MB.",
    description: "Combine separate PDFs into one document. Upload two or more PDFs and they are joined in the order you select, so a cover letter, CV and certificates can travel as a single file.",
    accept: ".pdf,application/pdf", multiple: true, fieldName: "files", endpoint: "/api/merge-pdf", resultLabel: "Your merged PDF",
    howTo: ["Upload two or more PDF files, in the order you want them joined.", "Click Convert.", "Download the single merged PDF."],
    useCases: ["Joining a CV, cover letter and certificates into one application file", "Combining monthly invoices into a yearly set", "Merging chapters of a report written as separate files"],
    faqs: [
      { q: "Does merging change my pages?", a: "No. Pages are copied in order, unchanged. Bookmarks and form fields are not carried over." },
      { q: "How many PDFs can I merge at once?", a: "Up to 20 files per conversion, each up to 25 MB." },
      { q: "Can I reorder pages after uploading?", a: "The merged order follows the order you select the files in. Re-select in the right order if you need a different sequence." },
    ],
    note: "Pages are copied unchanged and in order; bookmarks and interactive form fields are not preserved.",
    limits: "2 to 20 PDFs per request, each up to 25 MB. Free tier: 20 conversions per day.",
  },
  "split-pdf": {
    slug: "split-pdf", title: "Split PDF", meta: "Split a PDF by page ranges free, for example 1-3,5. Get one PDF per range in a ZIP file.",
    description: "Pull just the pages you need out of a long PDF. Tell the tool which ranges to keep — for example 1-3,5 — and you get a ZIP file with one PDF per range, so you can share or file a single chapter without sending the whole document.",
    accept: ".pdf,application/pdf", multiple: false, fieldName: "file", endpoint: "/api/split-pdf", resultLabel: "Your ZIP of split PDFs",
    howTo: ["Upload your PDF (up to 25 MB).", "Type the page ranges you want, for example 1-3,5.", "Click Convert and download the ZIP with one PDF per range."],
    useCases: ["Sending only the signed pages of a long contract", "Extracting one chapter from a course handout", "Splitting a scanned bundle into separate documents"],
    faqs: [
      { q: "How do I write page ranges?", a: "Use numbers, dashes for a span, and commas between ranges: 1-3,5 means pages 1, 2, 3 and page 5. Ranges must fall inside the PDF's page count." },
      { q: "What do I get back?", a: "A ZIP file containing one PDF per range, named pages-1-3.pdf and pages-5-5.pdf for the example above." },
      { q: "Can ranges overlap?", a: "Yes. A page can appear in more than one output file if you list it in more than one range." },
    ],
    note: "Output is a ZIP file with one PDF per page range you typed.",
    limits: "PDF up to 25 MB. Free tier: 20 conversions per day.",
  },
  "compress-pdf": {
    slug: "compress-pdf", title: "Compress PDF", meta: "Compress a PDF free to make it smaller for email and uploads. Best-effort compression; input and output sizes are shown.",
    description: "Shrink a PDF that is too large to email or upload. The file is re-saved with compressed object streams, and the page shows you the before and after sizes so you can judge the result honestly.",
    accept: ".pdf,application/pdf", multiple: false, fieldName: "file", endpoint: "/api/compress-pdf", resultLabel: "Your compressed PDF",
    howTo: ["Upload your PDF (up to 25 MB).", "Click Convert.", "Compare the input and output sizes shown, then download the smaller file."],
    useCases: ["Fitting a PDF under an email attachment limit", "Uploading a document to a portal with a strict size cap", "Saving storage space on a large report"],
    faqs: [
      { q: "How much smaller will my PDF get?", a: "It depends on the file. PDFs that are already compressed may shrink very little; uncompressed or bloated files shrink more. The result page always shows both sizes." },
      { q: "Is this as strong as desktop compression tools?", a: "No. This is best-effort compression, not Ghostscript-level recompression. Images are not downsampled, so image-heavy PDFs change the least." },
      { q: "Does compression change how pages look?", a: "No. Pages, text and images are kept as they are; only the file's internal storage is tightened." },
    ],
    note: "Best-effort compression only (not Ghostscript-level). Images are not downsampled. Input vs output size is reported in the UI.",
    limits: "PDF up to 25 MB. Free tier: 20 conversions per day.",
  },
};
