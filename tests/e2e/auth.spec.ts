import { test, expect } from "@playwright/test";

// Auth-surface tests that run WITHOUT live credentials: they prove the
// unauthenticated states, the redirect guards, and the auth gating — not a
// live Google login (that needs the owner's Supabase redirect + Vercel env).
test("unauthenticated API routes reject without a session", async ({ request }) => {
  const checkout = await request.post("/api/checkout");
  expect(checkout.status()).toBe(401);
  const exp = await request.get("/api/account/export");
  expect(exp.status()).toBe(401);
  const del = await request.post("/api/account/delete");
  expect(del.status()).toBe(401);
  const me = await request.get("/api/account/me");
  expect(me.status()).toBe(200);
  expect(await me.json()).toEqual({ signedIn: false });
});

test("callback never redirects to an external next URL", async ({ page }) => {
  // Fake code + hostile next: the route must land on /signin (exchange
  // fails) or a same-site path — never on the attacker's host.
  await page.goto("/auth/callback?code=fake&next=https://evil.example/phish");
  await expect(page).not.toHaveURL(/evil\.example/);
  await expect(page).toHaveURL(/\/signin/);
});

test("callback rejects protocol-relative next URLs too", async ({ page }) => {
  await page.goto("/auth/callback?code=fake&next=//evil.example/phish");
  await expect(page).not.toHaveURL(/evil\.example/);
  await expect(page).toHaveURL(/\/signin/);
});

test("sign-in page validates next and keeps the button same-site", async ({ page }) => {
  await page.goto("/signin?next=https://evil.example");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  // Either the configured Google button or the honest not-configured box;
  // neither may link or redirect anywhere external.
  const body = await page.locator("main").innerText();
  expect(body).toMatch(/Sign in with Google|not configured/);
  expect(body).not.toContain("evil.example");
});

test("admin API routes reject unauthenticated callers", async ({ request }) => {
  const overview = await request.get("/api/admin/overview");
  expect(overview.status()).toBe(403);
  const money = await request.get("/api/admin/money/export");
  expect(money.status()).toBe(403);
});
