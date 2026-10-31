import { test, expect } from "@playwright/test";

const TOOLS = ["pdf-to-word", "word-to-pdf", "image-to-pdf", "merge-pdf", "split-pdf", "compress-pdf"];
const LEGAL = ["privacy", "terms", "cookies", "refund-policy", "acceptable-use", "dmca", "disclaimer", "about", "contact"];

test("home page loads with tool links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /PDF Tools Hub/i }).first()).toBeVisible();
  for (const slug of TOOLS) {
    await expect(page.locator(`a[href="/${slug}"]`).first()).toBeVisible();
  }
});

test("each tool page renders", async ({ page }) => {
  for (const slug of TOOLS) {
    await page.goto(`/${slug}`);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("legal pages render", async ({ page }) => {
  for (const slug of LEGAL) {
    const res = await page.goto(`/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("admin redirects to sign-in when logged out", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin/);
});

test("account redirects to sign-in when logged out", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/signin/);
});

test("onboarding redirects to sign-in when logged out", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/signin/);
});

test("sign-in page shows Google sign-in or not-configured state", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  const body = await page.locator("main").innerText();
  expect(body).toMatch(/Sign in with Google|not configured/);
});

test("cookie banner accepts and hides", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("pth-cookie-choice"));
  await page.reload();
  const banner = page.getByRole("dialog", { name: "Cookie choice" });
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "Accept" }).click();
  await expect(banner).toBeHidden();
  const choice = await page.evaluate(() => localStorage.getItem("pth-cookie-choice"));
  expect(choice).toBe("accepted");
});

test("sitemap excludes private pages", async ({ page }) => {
  const res = await page.goto("/sitemap.xml");
  expect(res?.status()).toBe(200);
  const text = await page.locator("body").innerText();
  expect(text).not.toContain("/admin");
  expect(text).not.toContain("/account");
  expect(text).not.toContain("/signin");
});
