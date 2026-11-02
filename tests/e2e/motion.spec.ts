import { test, expect } from "@playwright/test";

// Motion smoke check (Motion pattern from AI Studio, 2026-11-01):
// pages render fully with the motion components present, and with
// reduced motion preferred the content still renders immediately
// (Reveal falls back to a plain div, no animation at all).
test("homepage renders with motion sections", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /PDF work, done in a minute/i })
  ).toBeVisible();
  await expect(page.locator('a[href="/merge-pdf"]').first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Every tool on one page/i })).toBeVisible();
});

test("tool page renders with motion shell and button", async ({ page }) => {
  await page.goto("/merge-pdf");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Convert/i })).toBeVisible();
});

test("content renders immediately with reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /PDF work, done in a minute/i })
  ).toBeVisible();
  await page.goto("/merge-pdf");
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Convert/i })).toBeVisible();
  await context.close();
});
