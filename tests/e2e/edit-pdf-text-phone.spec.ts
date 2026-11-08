// Regression: Edit PDF text on a 390px phone (second bug round).
// The user reported the rendered page "become small": the certificate
// sat in a narrow strip on the left, too small to read or tap.
// Two real causes were found and fixed:
//  1. The render scale was computed from the OUTER tool wrapper's width,
//     but the canvas sits two paddings deeper — the bitmap came out ~17%
//     wider than its display box, so the overlay sat too far right.
//  2. The overlay/download coordinates were raw PDF points (unscaled,
//     Y unflipped) and the PDF coordinates were double-converted through
//     convertToPdfPoint — so line buttons sat mirrored/shifted off their
//     text, and edited text landed in the wrong place in the download.
// This test pins all three: the canvas fills the phone width, a line
// button sits on top of its rendered text, and the downloaded edit lands
// at the original position. A clipped PDF (visible content confined to
// a left strip, as in the user's certificate) must still work via zoom.
import { test, expect } from "@playwright/test";
import {
  PDFDocument,
  PDFName,
  PDFObject,
  PDFRef,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
  rgb,
} from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFile } from "node:fs/promises";

test.use({ viewport: { width: 390, height: 844 } });

type TextPos = { str: string; x: number; y: number };

async function extractTextPositions(bytes: Uint8Array): Promise<TextPos[]> {
  const data = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: TextPos[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const item of tc.items) {
      if ("str" in item && "transform" in item) {
        out.push({ str: item.str, x: item.transform[4], y: item.transform[5] });
      }
    }
  }
  return out;
}

function latin1(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return s;
}
function toBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** A4 certificate-like PDF: header, QR-like block, photo-like block, field rows, watermark lines. */
async function makeCertPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  page.drawText("Government of Nepal", { x: 230, y: 800, size: 10 });
  page.drawText("MINISTRY OF HOME AFFAIRS", { x: 190, y: 780, size: 13 });
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 7; j++)
      if ((i * 7 + j) % 3 !== 0)
        page.drawRectangle({ x: 60 + i * 6, y: 700 - j * 6, width: 5, height: 5, color: rgb(0, 0, 0) });
  page.drawRectangle({ x: 60, y: 560, width: 80, height: 100, color: rgb(0.15, 0.15, 0.2) });
  page.drawText("Full Name : Sushila Dahal", { x: 60, y: 520, size: 11 });
  page.drawText("Address : Itahari 19, Sunsari, Nepal", { x: 60, y: 500, size: 11 });
  page.drawText("Date of Birth : 08 February 2006", { x: 60, y: 480, size: 11 });
  for (let y = 440; y > 140; y -= 18) {
    page.drawText("Nepal Police Nepal Police Nepal Police", { x: 60, y, size: 7, color: rgb(0.9, 0.7, 0.7) });
  }
  page.drawText("There is no criminal record against her.", { x: 60, y: 90, size: 10 });
  return Buffer.from(await doc.save());
}

/** Same certificate, but rendering is clipped to the left 85pt — the
 *  narrow-strip look of the user's real certificate. Text extraction
 *  still sees every line; only the visible image is a strip. */
async function makeClippedCertPdf(): Promise<Buffer> {
  const base = await makeCertPdf();
  const doc = await PDFDocument.load(base);
  const page = doc.getPage(0);
  const node = page.node;
  let first: PDFObject | undefined = node.Contents();
  if (first instanceof PDFArray) first = first.get(0);
  const stream = first instanceof PDFRef ? doc.context.lookup(first) : first;
  if (!(stream instanceof PDFRawStream)) throw new Error("test setup: no content stream");
  const decoded = latin1(decodePDFRawStream(stream).decode());
  const full = "q 0 0 85 842 re W n " + decoded + " Q";
  node.set(PDFName.of("Contents"), doc.context.flateStream(toBytes(full)));
  return Buffer.from(await doc.save());
}

async function uploadCert(page: import("@playwright/test").Page, pdf: Buffer, name: string) {
  await page.addInitScript(() => localStorage.setItem("pth-cookie-choice", "declined"));
  await page.goto("/edit-pdf-text");
  await page.locator("#upload-zone-input").setInputFiles({ name, mimeType: "application/pdf", buffer: pdf });
  await expect(page.getByText(/text lines on 1 page/)).toBeVisible({ timeout: 15000 });
}

test("edit-pdf-text fills a 390px phone and the overlay sits on its text", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await uploadCert(page, await makeCertPdf(), "cert.pdf");

  // The watermark repeats 17 times at 7pt: only the first copy is kept,
  // so 2 header + 3 fields + 1 watermark + 1 bottom = 7 lines, not 23.
  await expect(page.getByText("7 text lines on 1 page")).toBeVisible();

  const canvas = page.locator("section[aria-label='Page 1'] canvas");
  const container = page.locator("section[aria-label='Page 1'] div.relative");
  const canvasBox = await canvas.boundingBox();
  const containerBox = await container.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(containerBox).not.toBeNull();
  // The page fills the phone width: canvas display width is the container
  // width (not ~25% of it), and the bitmap is not stretched by CSS.
  expect(Math.abs(canvasBox!.width - containerBox!.width)).toBeLessThanOrEqual(2);
  expect(canvasBox!.width).toBeGreaterThanOrEqual(250);
  const bitmapW = await canvas.evaluate((c: HTMLCanvasElement) => c.width);
  expect(Math.abs(bitmapW - canvasBox!.width)).toBeLessThanOrEqual(2);

  // The line button sits ON its rendered text: inside the canvas, in the
  // upper half (the field is in the upper half of the page), with a
  // finger-sized tap target.
  const lineBtn = page.getByRole("button", { name: "Edit text: Full Name : Sushila Dahal" });
  await expect(lineBtn).toBeVisible();
  const btnBox = await lineBtn.boundingBox();
  expect(btnBox).not.toBeNull();
  expect(btnBox!.x).toBeGreaterThanOrEqual(canvasBox!.x - 1);
  expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width + 1);
  expect(btnBox!.y).toBeGreaterThanOrEqual(canvasBox!.y - 1);
  expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(canvasBox!.y + canvasBox!.height + 1);
  expect(btnBox!.height).toBeGreaterThanOrEqual(44);
  const centerY = (btnBox!.y + btnBox!.height / 2 - canvasBox!.y) / canvasBox!.height;
  expect(centerY).toBeGreaterThan(0.2);
  expect(centerY).toBeLessThan(0.55);
  expect(errors).toEqual([]);

  // Edit the line, then zoom to 200%: the overlay must stay on its text.
  await lineBtn.click();
  const input = page.getByLabel("Edit text: Full Name : Sushila Dahal");
  await input.fill("Full Name : Mina Dahal");
  await input.press("Enter");
  await expect(page.getByText("Mina Dahal").first()).toBeVisible();

  await page.getByRole("button", { name: "200%", exact: true }).click();
  await page.waitForTimeout(800);
  const zoomedCanvasBox = await canvas.boundingBox();
  const zoomedContainerBox = await container.boundingBox();
  expect(zoomedCanvasBox).not.toBeNull();
  expect(zoomedCanvasBox!.width).toBeGreaterThan(1000);
  expect(zoomedCanvasBox!.width).toBeGreaterThan(zoomedContainerBox!.width);
  const zoomedBtnBox = await lineBtn.boundingBox();
  expect(zoomedBtnBox).not.toBeNull();
  expect(zoomedBtnBox!.x).toBeGreaterThanOrEqual(zoomedCanvasBox!.x - 1);
  expect(zoomedBtnBox!.x + zoomedBtnBox!.width).toBeLessThanOrEqual(
    zoomedCanvasBox!.x + zoomedCanvasBox!.width + 1,
  );
  expect(zoomedBtnBox!.y).toBeGreaterThanOrEqual(zoomedCanvasBox!.y - 1);
  expect(zoomedBtnBox!.y + zoomedBtnBox!.height).toBeLessThanOrEqual(
    zoomedCanvasBox!.y + zoomedCanvasBox!.height + 1,
  );

  // Download: the edited text must land where the original was
  // (x≈60, baseline y≈520), not mirrored or off-page.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download edited PDF" }).click();
  const download = await downloadPromise;
  const out = await readFile((await download.path()) as string);
  const positions = await extractTextPositions(out);
  const joined = positions.map((p) => p.str).join(" ");
  expect(joined).toContain("Mina Dahal");
  expect(joined).not.toContain("Sushila Dahal");
  const mina = positions.find((p) => p.str.includes("Mina Dahal"));
  expect(mina).toBeDefined();
  expect(Math.abs(mina!.x - 60)).toBeLessThanOrEqual(6);
  expect(Math.abs(mina!.y - 520)).toBeLessThanOrEqual(6);
  expect(errors).toEqual([]);
});

test("a clipped certificate still works via zoom", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await uploadCert(page, await makeClippedCertPdf(), "clipped-cert.pdf");
  await expect(page.getByText("Could not read the text")).toHaveCount(0);
  const canvas = page.locator("section[aria-label='Page 1'] canvas");
  const container = page.locator("section[aria-label='Page 1'] div.relative");
  await page.getByRole("button", { name: "200%", exact: true }).click();
  await page.waitForTimeout(800);
  const canvasBox = await canvas.boundingBox();
  const containerBox = await container.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThan(1000);
  expect(canvasBox!.width).toBeGreaterThan(containerBox!.width);
  const lineBtn = page.getByRole("button", { name: "Edit text: Full Name : Sushila Dahal" });
  await expect(lineBtn).toBeVisible();
  await lineBtn.click();
  await expect(page.getByLabel("Edit text: Full Name : Sushila Dahal")).toBeVisible();
  expect(errors).toEqual([]);
});
