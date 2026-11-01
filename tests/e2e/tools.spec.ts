// E2E for the new browser tools + the usage counter + new pages.
// Fixtures are generated in-test (pdf-lib for PDFs, canvas for images) so
// no binary fixtures live in the repo.
import { test, expect, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFile } from "node:fs/promises";

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage([595, 842]);
    page.drawText(`Test page ${i + 1}`, { x: 50, y: 800, size: 24 });
  }
  return Buffer.from(await doc.save());
}

async function makePng(page: Page, w: number, h: number, color: string): Promise<Buffer> {
  const dataUrl: string = await page.evaluate(
    ([w, h, color]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/png");
    },
    [w, h, color] as const,
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

async function makeJpeg(page: Page, w: number, h: number): Promise<Buffer> {
  const dataUrl: string = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#336699";
      ctx.fillRect(0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.92);
    },
    [w, h] as const,
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

/** Inject an EXIF orientation tag into a JPEG (after SOI, before the rest). */
function injectExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.concat([
    Buffer.from("II*\0", "ascii"), // little-endian, magic 42
    Buffer.from([0x08, 0x00, 0x00, 0x00]), // IFD0 offset = 8
    Buffer.from([0x01, 0x00]), // 1 entry
    Buffer.from([0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00]), // tag 0x0112, SHORT, count 1
    Buffer.from([orientation, 0x00, 0x00, 0x00]), // value
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // next IFD = 0
  ]);
  const app1Body = Buffer.concat([Buffer.from("Exif\0\0", "ascii"), tiff]);
  const app1Len = app1Body.length + 2;
  const app1 = Buffer.concat([
    Buffer.from([0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff]),
    app1Body,
  ]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

test("image-to-pdf converts two PNGs in the browser", async ({ page }) => {
  await page.goto("/image-to-pdf");
  const png1 = await makePng(page, 100, 80, "#cc0000");
  const png2 = await makePng(page, 80, 100, "#00aa00");
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles([
    { name: "red.png", buffer: png1, mimeType: "image/png" },
    { name: "green.png", buffer: png2, mimeType: "image/png" },
  ]);
  await expect(page.getByAltText("red.png")).toBeVisible();
  await expect(page.getByAltText("green.png")).toBeVisible();
  await expect(page.getByText(/Estimated output size/)).toBeVisible();
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const bytes = await readFile(path!);
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
  expect(bytes.length).toBeGreaterThan(1000);
});

test("image-to-pdf shows a per-file error but still converts the good file", async ({ page }) => {
  await page.goto("/image-to-pdf");
  const png = await makePng(page, 60, 60, "#0000cc");
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles([
    { name: "good.png", buffer: png, mimeType: "image/png" },
    { name: "fake.png", buffer: Buffer.from("this is not an image"), mimeType: "image/png" },
  ]);
  await expect(page.getByText(/not a recognised file|Could not read/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
});

test("image-to-pdf honours EXIF orientation (rotated phone photo)", async ({ page }) => {
  await page.goto("/image-to-pdf");
  // 100x50 landscape JPEG + EXIF orientation 6 (rotate 90 CW) = portrait.
  const jpeg = await makeJpeg(page, 100, 50);
  const exifJpeg = injectExifOrientation(jpeg, 6);
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles([{ name: "phone.jpg", buffer: exifJpeg, mimeType: "image/jpeg" }]);
  await expect(page.getByAltText("phone.jpg")).toBeVisible();
  await page.locator("#opt-pagesize").selectOption("fit");
  await page.getByRole("button", { name: "Convert to PDF" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  const doc = await PDFDocument.load(bytes);
  const { width, height } = doc.getPage(0).getSize();
  expect(height).toBeGreaterThan(width); // portrait, proving EXIF was applied
});

test("merge-pdf server route still works", async ({ page }) => {
  await page.goto("/merge-pdf");
  const pdf = await makePdf(1);
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "a.pdf", buffer: pdf, mimeType: "application/pdf" },
    { name: "b.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  await page.getByRole("button", { name: "Convert" }).click();
  await expect(page.getByText("Conversion complete")).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download result" }).click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
});

test("pdf-to-jpg renders a page to JPG", async ({ page }) => {
  await page.goto("/pdf-to-jpg");
  const pdf = await makePdf(1);
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "doc.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Convert to JPG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.jpg$/);
  const bytes = await readFile((await download.path())!);
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
});

test("rotate-pdf rotates a page", async ({ page }) => {
  await page.goto("/rotate-pdf");
  const pdf = await makePdf(1);
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "doc.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  await expect(page.getByAltText("Page 1")).toBeVisible();
  await page.getByLabel("Rotation for page 1").selectOption("90");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save rotated PDF" }).click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
});

test("organize-pages deletes a page", async ({ page }) => {
  await page.goto("/organize-pages");
  const pdf = await makePdf(3);
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "doc.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  await expect(page.getByAltText("Page 3")).toBeVisible();
  // The second "Delete" checkbox belongs to page 2.
  await page.getByRole("checkbox").nth(1).check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save reorganised PDF" }).click();
  const download = await downloadPromise;
  const bytes = await readFile((await download.path())!);
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
});

test("watermark and page numbers produce PDFs", async ({ page }) => {
  const pdf = await makePdf(2);
  await page.goto("/watermark-pdf");
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "doc.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  let downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add watermark" }).click();
  let download = await downloadPromise;
  let bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");

  await page.goto("/page-numbers");
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "doc.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add page numbers" }).click();
  download = await downloadPromise;
  bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
});

test("usage counter API returns real numbers", async ({ request }) => {
  const res = await request.get("/api/usage/remaining");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(typeof body.remaining === "number" || body.remaining === null).toBe(true);
  expect(typeof body.quota).toBe("number");
  expect(["guest", "free", "premium"]).toContain(body.plan);
});

test("new pages render: pricing, guides, landing, guide detail", async ({ page }) => {
  for (const [url, heading] of [
    ["/pricing", "Simple pricing"],
    ["/guides", "Guides"],
    ["/jpg-to-pdf", "JPG to PDF"],
    ["/guides/phone-photos-to-pdf", "How to turn phone photos into one PDF"],
  ] as const) {
    await page.goto(url);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});

test("ocr converts a rendered text page to searchable text", async ({ page }) => {
  test.setTimeout(180_000);
  // Build a one-page PDF whose page is a rendered "HELLO OCR" image.
  const png: Buffer = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 400);
    ctx.fillStyle = "#000000";
    ctx.font = "bold 72px Arial";
    ctx.fillText("HELLO OCR", 100, 200);
    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }).then((arr) => Buffer.from(arr));
  const doc = await PDFDocument.create();
  const img = await doc.embedPng(png);
  const pdfPage = doc.addPage([img.width, img.height]);
  pdfPage.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  const pdf = Buffer.from(await doc.save());

  await page.goto("/ocr-pdf");
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "scan.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  await page.getByRole("button", { name: "Make searchable" }).click();
  await expect(page.getByText(/HELLO/i)).toBeVisible({ timeout: 170_000 });
});
