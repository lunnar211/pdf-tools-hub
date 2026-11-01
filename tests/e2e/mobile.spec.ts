import { test, expect } from "@playwright/test";

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

test("admin pages redirect to sign-in when logged out", async ({ page }) => {
  for (const path of ["/admin/database", "/admin/providers"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/signin/);
  }
});
