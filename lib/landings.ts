// Original landing pages (written for this site, not scraped). Each one
// answers one search-style question and points at the real tool.
export type Landing = {
  slug: string;
  title: string;
  meta: string;
  hero: string;
  intro: string;
  points: string[];
  faqs: { q: string; a: string }[];
  toolSlug: string;
  toolLabel: string;
};

export const LANDINGS: Landing[] = [
  {
    slug: "jpg-to-pdf",
    title: "JPG to PDF — convert JPG images to PDF free",
    meta: "Convert JPG to PDF free, in your browser. Combine JPG photos into one PDF with reorder, rotate, and page options — no upload needed.",
    hero: "JPG to PDF, free — in your browser",
    intro:
      "Turn JPG photos into a single PDF without uploading them anywhere. The conversion runs on your device, so your pictures never leave the browser — and you can reorder them, rotate sideways shots, and pick page size and quality before downloading.",
    points: [
      "JPG, PNG, WebP, BMP, and HEIC supported",
      "Drag to reorder; rotate any photo",
      "A4, Letter, A3, or fit-to-image pages",
      "Estimated size before you download",
    ],
    faqs: [
      { q: "Is JPG to PDF really free?", a: "Yes. Guests get 20 conversions a day; signing in (free) raises that to 100 a day. No watermark is added to your PDF." },
      { q: "Do my JPGs get uploaded?", a: "No. Conversion runs in your browser with pdf-lib. Only if your browser cannot decode a JPG does the page offer a server fallback, which processes the file in memory and never stores it." },
      { q: "Can I combine JPGs with PNGs?", a: "Yes — mix JPG, PNG, WebP, BMP, and HEIC in one conversion, in any order." },
    ],
    toolSlug: "image-to-pdf",
    toolLabel: "Convert JPG to PDF",
  },
  {
    slug: "photos-to-pdf-on-phone",
    title: "Photos to PDF on your phone — free, no app needed",
    meta: "Turn phone photos into a PDF on your phone, free, with no app to install. Capture with the camera, fix rotation, and download one PDF.",
    hero: "Photos to PDF on your phone — no app needed",
    intro:
      "You do not need to install anything to turn phone photos into a PDF. Open this page in your phone's browser, capture pages with the camera or pick photos from your gallery, fix any sideways shots, and download one PDF you can email or upload to a form.",
    points: [
      "Camera capture built in — photograph a page, straight into the PDF",
      "EXIF rotation applied automatically; manual rotate if needed",
      "Works on iPhone (including HEIC) and Android",
      "Small-file quality option for email attachments",
    ],
    faqs: [
      { q: "Does it work on iPhone?", a: "Yes. iPhone photos (including HEIC) are decoded in the browser — Safari decodes HEIC natively, other browsers use a built-in decoder. If a photo cannot be decoded, it fails on its own instead of breaking the whole batch." },
      { q: "Do I need an account?", a: "No. Guests get 20 conversions a day. Signing in is free and raises the limit to 100 a day." },
      { q: "Will the PDF be too big to email?", a: "Choose “Small file” quality when converting, or run the finished PDF through Compress PDF. The estimated size is shown before you download." },
    ],
    toolSlug: "image-to-pdf",
    toolLabel: "Turn phone photos into a PDF",
  },
  {
    slug: "combine-images-into-one-pdf",
    title: "Combine images into one PDF — free",
    meta: "Combine images into one PDF free, in your browser. Mix JPG, PNG, WebP, BMP, and HEIC, reorder them, and download a single PDF.",
    hero: "Combine images into one PDF, free",
    intro:
      "Several images — receipts, certificates, scanned pages — become one PDF that is easier to send, print, and file than a pile of separate pictures. Combine them in your browser, in the order you choose, with one image per page or several per page.",
    points: [
      "Up to 20 images per PDF",
      "1, 2, 4, or 6 images per page",
      "Reorder by dragging; rotate sideways images",
      "PDF title and page numbers optional",
    ],
    faqs: [
      { q: "What order do the pages come in?", a: "The order you arrange the thumbnails in — drag them, or use the up/down buttons. The PDF follows that order exactly." },
      { q: "Are images cropped?", a: "By default, no: “Fit” scales each image to its cell while keeping proportions. “Fill” crops to the cell, and “Stretch” fills it exactly." },
      { q: "Can I add pages to an existing PDF instead?", a: "For that, use Merge PDF: convert your images to a PDF first, then merge it with the existing file." },
    ],
    toolSlug: "image-to-pdf",
    toolLabel: "Combine images into one PDF",
  },
  {
    slug: "scan-to-pdf-free",
    title: "Scan to PDF free — from phone photos or scanned pages",
    meta: "Scan to PDF free: turn phone photos or scanned pages into a searchable-ready PDF in your browser, with OCR available for scanned text.",
    hero: "Scan to PDF, free",
    intro:
      "A “scan” today is usually a phone photo of a page — and that is all this needs. Photograph or upload the pages, combine them into one PDF, and if the pages are scanned text you want to search, run the result through OCR to make it searchable.",
    points: [
      "Phone camera capture, no app to install",
      "One PDF from many page photos",
      "Optional OCR step makes scanned text searchable",
      "Everything runs in your browser — pages never leave the device",
    ],
    faqs: [
      { q: "Is this a real scanner app?", a: "No app is involved. Your phone's camera and browser do the capturing; this site does the combining. For a flatbed scanner, save the scans as images and upload them the same way." },
      { q: "Can the scanned PDF be searched?", a: "After combining, open the OCR tool: it reads the scanned text (English, first 10 pages) and returns a PDF whose text can be searched and copied, looking identical to the scan." },
      { q: "What if a page photo is skewed or dark?", a: "Straighten it with your camera before capturing, or rotate it in the tool. OCR accuracy depends on scan quality — clean, straight, well-lit pages read best." },
    ],
    toolSlug: "image-to-pdf",
    toolLabel: "Scan pages into a PDF",
  },
];
