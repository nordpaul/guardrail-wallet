import { expect, test } from "@playwright/test";

test("landing page exposes the product and primary navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Payment firewall for AI agents/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/payment/i);
  await expect(page.getByRole("link", { name: "Read the documentation", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /support with ton/i })).toBeVisible();
});

for (const path of ["/docs", "/docs/ru", "/api", "/dashboard"]) {
  test(`${path} renders a usable page`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("h1").first()).toBeVisible();
  });
}

test("desktop documentation navigation reaches the API reference", async ({ page }) => {
  await page.goto("/docs");
  await page.getByRole("link", { name: /api/i }).first().click();
  await expect(page).toHaveURL(/\/api$/);
  await expect(page.locator("h1").first()).toBeVisible();
});
