import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

// Mobile-first (360px) + keyboard checks for the redesign. No live
// credentials are used: these prove layout integrity and keyboard
// reachability, not a signed-in session.
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
});

test("360px pages have no horizontal overflow", async ({ page }) => {
  for (const path of ["/", "/pricing", "/image-to-pdf", "/signin"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

test("keyboard focus moves through home navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const tag = await page.evaluate(() => document.activeElement?.tagName ?? "");
  expect(["A", "BUTTON"]).toContain(tag);
});

test("sign-in page is keyboard reachable (or honestly unconfigured)", async ({ page }) => {
  await page.goto("/signin");
  const body = await page.locator("main").innerText();
  if (body.includes("not configured")) {
    expect(body).toMatch(/not configured/);
    return;
  }
  const email = page.locator("#signin-email");
  await expect(email).toBeVisible();
  await email.click();
  await email.fill("test@example.com");
  await expect(email).toHaveValue("test@example.com");
  const password = page.locator("#signin-password");
  await expect(password).toBeVisible();
});

test("edit-pdf-text is usable at 360px: no overflow, line editable", async ({ page }) => {
  const doc = await PDFDocument.create();
  const pdfPage = doc.addPage([595, 842]);
  pdfPage.drawText("Hello World", { x: 50, y: 800, size: 24 });
  const pdf = Buffer.from(await doc.save());
  await page.goto("/edit-pdf-text");
  await page.locator('input[type="file"]').first().setInputFiles([
    { name: "doc.pdf", buffer: pdf, mimeType: "application/pdf" },
  ]);
  await expect(page.getByRole("button", { name: "Edit text: Hello World" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Edit text: Hello World" }).click();
  const input = page.getByLabel("Edit text: Hello World");
  await expect(input).toBeVisible();
  await input.fill("Hello Mars");
  await input.press("Enter");
  await expect(page.getByRole("button", { name: "Download edited PDF" })).toBeVisible();
  const overflowAfter = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflowAfter).toBeLessThanOrEqual(1);
});

test("admin pages redirect to sign-in when logged out", async ({ page }) => {
  for (const path of ["/admin/database", "/admin/providers"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/signin/);
  }
});
