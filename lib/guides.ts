// Original guides (written for this site, not scraped). Each guide links
// back to the real tool it describes.
export type Guide = {
  slug: string;
  title: string;
  meta: string;
  intro: string;
  sections: { heading: string; body: string }[];
  toolSlug: string;
  toolLabel: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "phone-photos-to-pdf",
    title: "How to turn phone photos into one PDF",
    meta: "Turn phone photos into a single PDF, free, in your browser. Fix rotation, order pages, and keep the file small enough to email.",
    intro:
      "A stack of phone photos — receipts, certificates, ID pages — becomes one PDF you can email, print, or upload to a form. This guide walks through the whole flow on PDF Tools Hub, where the conversion happens in your browser, so the photos never leave your device.",
    sections: [
      {
        heading: "1. Add the photos in any order",
        body: "Open the Image to PDF tool and add up to 20 photos (JPG, PNG, WebP, BMP, or HEIC from an iPhone). You can drop files, browse, paste from the clipboard, or — on a phone — tap “Take a photo” to capture a page with the camera. Files that fail a check (wrong type, over 10 MB) are rejected one by one; the rest still convert.",
      },
      {
        heading: "2. Fix order and rotation before converting",
        body: "Drag thumbnails into the order you want, or use the up/down buttons on a keyboard. If a photo came out sideways, rotate it left or right right there. Phone photos also carry EXIF rotation data, and the tool applies it automatically, so most photos already appear upright.",
      },
      {
        heading: "3. Choose size, layout, and quality",
        body: "A4 is the safe default for forms and printing; “Fit to image” keeps each page the shape of its photo. One image per page is clearest for documents; 2, 4, or 6 per page suits photo sheets. “High” keeps original quality, “Medium” shrinks the file for email, and “Small file” downscales for the smallest result. The estimated output size updates as you choose, and the real size is shown after conversion.",
      },
      {
        heading: "4. Download, then shrink or merge if needed",
        body: "The PDF downloads straight from your browser. If it is still too big for an email attachment, run it through Compress PDF; if it belongs with other documents, combine it with Merge PDF. Both are one click from the result screen.",
      },
    ],
    toolSlug: "image-to-pdf",
    toolLabel: "Open Image to PDF",
  },
  {
    slug: "split-pdf-by-pages",
    title: "How to split a PDF into separate files",
    meta: "Split a PDF by page ranges, free. Pull out the pages you need as separate PDFs in a ZIP file.",
    intro:
      "A long PDF often contains a few pages you actually need — one chapter, one invoice, one form. Splitting pulls those pages out into their own files, so you send exactly what was asked for and nothing extra.",
    sections: [
      {
        heading: "1. Know your page numbers",
        body: "Open the PDF and note which pages you need. Page numbers in the file usually match the numbers you type, but a cover or contents page can shift them by one — check the first page of the range before you rely on it.",
      },
      {
        heading: "2. Type ranges, not one page at a time",
        body: "On the Split PDF tool, type ranges like 1-3,5 — that means pages 1, 2, 3, and 5. Ranges can overlap: a page can appear in more than one output file if you list it twice. Each range becomes one PDF inside a ZIP download.",
      },
      {
        heading: "3. Check the result before sending",
        body: "Open the ZIP, confirm each file has the pages you expected, and rename them clearly (for example, “Contract — pages 4-6.pdf”) before attaching them. If the order inside a file is wrong, use Organize pages to rearrange it, or Merge PDF to recombine parts in a new order.",
      },
    ],
    toolSlug: "split-pdf",
    toolLabel: "Open Split PDF",
  },
  {
    slug: "shrink-pdf-for-email",
    title: "How to shrink a PDF so it fits an email",
    meta: "Shrink a PDF for email, free. Understand why compression helps some files more than others, and what to do when it is not enough.",
    intro:
      "Email providers cap attachments — often at 20 or 25 MB — and portals can be stricter. When a PDF is over the limit, compression is the first thing to try, but it helps some files far more than others. This guide sets honest expectations and a fallback plan.",
    sections: [
      {
        heading: "1. Try Compress PDF first",
        body: "Upload the file to Compress PDF. The tool re-saves it with compressed internal storage and shows you the before and after sizes, so you can see exactly what you gained. Uncompressed or bloated files shrink the most; files that are already well compressed may barely change.",
      },
      {
        heading: "2. Understand the limit of browser-side compression",
        body: "This site's compression is best-effort: it tightens the file's internal storage but does not downsample images, so an image-heavy PDF (scans, photos) changes the least. It never changes how pages look — text and images stay exactly as they are.",
      },
      {
        heading: "3. If it is still too big, split or rebuild",
        body: "When compression alone is not enough, split the PDF into parts and send the part that matters, or — for photos — rebuild at a smaller size: convert the pages to JPG, then back to PDF at “Small file” quality. Both paths keep the content readable while cutting the size a lot.",
      },
    ],
    toolSlug: "compress-pdf",
    toolLabel: "Open Compress PDF",
  },
  {
    slug: "ocr-searchable-text",
    title: "How OCR turns a scanned PDF into searchable text",
    meta: "OCR explained simply: how a scanned PDF becomes searchable, what accuracy to expect, and when to check the result by hand.",
    intro:
      "A scanned PDF is a set of pictures of pages, not text — that is why you cannot search it or copy words out of it. OCR (optical character recognition) reads the pictures and works out which letters they show, then hides that text behind the image so the page looks the same but behaves like real text.",
    sections: [
      {
        heading: "1. What the tool actually does",
        body: "On this site, OCR runs in your browser with Tesseract.js. Each page is rendered as an image, the text on it is recognised (English only), and a new PDF is built: the original page image on top, with the recognised words drawn underneath at zero opacity. Readers extract text regardless of opacity, so the result is searchable and copyable while looking identical to the scan.",
      },
      {
        heading: "2. What affects accuracy",
        body: "Clean, straight, printed scans at good contrast recognise well. Faint text, skewed pages, handwriting, unusual fonts, and low-resolution photos recognise poorly. The tool also shows the extracted text, so you can spot mistakes before you rely on the result — always check names, numbers, and dates by hand.",
      },
      {
        heading: "3. Know the limits",
        body: "Only the first 10 pages are processed, because browser OCR is slow (roughly 10–30 seconds per page on a phone). For longer documents, split the PDF into 10-page parts and OCR each part. And if a page already has a real text layer (most exported PDFs do), you do not need OCR at all — PDF to Word will extract that text directly.",
      },
    ],
    toolSlug: "ocr-pdf",
    toolLabel: "Open OCR: scanned PDF to searchable text",
  },
];
