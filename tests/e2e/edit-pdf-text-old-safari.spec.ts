// Regression: Edit PDF text on old mobile Safari (before Safari 18 / iOS 18).
// pdf.js's page.getTextContent() iterates the text stream with
// `for await...of`, which needs ReadableStream.prototype[Symbol.asyncIterator]
// — missing on Safari < 18. The page still renders (rendering never touches
// that API), so the tool looked fine until text extraction threw
// "undefined is not a function (near '...t of e...')" — the minified
// for-await loop — and no line was editable.
// This test simulates that old browser by deleting the async iterator
// after page load, then requires the tool to still work end to end.
import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { readFile } from "node:fs/promises";

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const data = new Uint8Array(bytes);
  const doc = await pdfjs.getDocument({ data }).promise;
  let out = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    out += tc.items.map((i) => ("str" in i ? i.str : "")).join(" ") + "\n";
  }
  return out;
}

/** Multi-line PDF: header, field rows, small print — like a certificate. */
async function makeComplexPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  page.drawText("Government of Nepal", { x: 220, y: 800, size: 10 });
  page.drawText("MINISTRY OF HOME AFFAIRS", { x: 180, y: 780, size: 13 });
  page.drawText("Full Name : Sushila Dahal", { x: 60, y: 700, size: 11 });
  page.drawText("Address : Itahari 19, Sunsari, Nepal", { x: 60, y: 680, size: 11 });
  page.drawText("Date of Birth : 08 February 2006", { x: 60, y: 660, size: 11 });
  for (let y = 600; y > 120; y -= 18) {
    page.drawText("NEPAL POLICE watermark line", { x: 60, y, size: 7 });
  }
  page.drawText("There is no criminal record against her till 16 January 2026.", {
    x: 60,
    y: 90,
    size: 10,
  });
  return Buffer.from(await doc.save());
}

test("edit-pdf-text works when ReadableStream asyncIterator is missing (old Safari)", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // Never show the cookie dialog (it is set from localStorage on load).
  await page.addInitScript(() => localStorage.setItem("pth-cookie-choice", "declined"));
  await page.goto("/edit-pdf-text");
  // Simulate old Safari: remove the async iterator AFTER the page loaded.
  const removed = await page.evaluate(() => {
    const proto = ReadableStream.prototype as unknown as Record<symbol, unknown>;
    delete proto[Symbol.asyncIterator];
    return typeof (ReadableStream.prototype as unknown as Record<symbol, unknown>)[Symbol.asyncIterator];
  });
  expect(removed, "test setup: asyncIterator must be deleted").toBe("undefined");

  const pdf = await makeComplexPdf();
  await page.locator("#upload-zone-input").setInputFiles({
    name: "complex-cert.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  // Extraction finished: the status line appears only when pages are done.
  await expect(page.getByText(/text lines on 1 page/)).toBeVisible({ timeout: 15000 });
  // The polyfill must have restored the iterator before pdf.js ran.
  const restored = await page.evaluate(
    () => typeof (ReadableStream.prototype as unknown as Record<symbol, unknown>)[Symbol.asyncIterator],
  );
  expect(restored).toBe("function");
  expect(errors).toEqual([]);
  // No crash error: the tool shell always renders an (empty) alert live
  // region, so assert on the error text itself, not the alert role.
  await expect(page.getByText("undefined is not a function")).toHaveCount(0);
  await expect(page.getByText("Could not read the text")).toHaveCount(0);

  const editButton = page.getByRole("button", { name: "Edit text: Full Name : Sushila Dahal" });
  await expect(editButton).toBeVisible();
  await editButton.click();
  const input = page.getByLabel("Edit text: Full Name : Sushila Dahal");
  await input.fill("Full Name : Mina Dahal");
  await input.press("Enter");
  await expect(page.getByText("Mina Dahal").first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download edited PDF" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const out = await readFile(path as string);
  const text = await extractPdfText(out);
  expect(text).toContain("Mina Dahal");
  expect(text).not.toContain("Sushila Dahal");
});
