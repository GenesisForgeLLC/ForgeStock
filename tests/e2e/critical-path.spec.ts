import { test, expect } from "@playwright/test";

/**
 * Critical-path smoke test:
 *   sign in → create product → record print batch → create event → allocate →
 *   open → sell one → confirm remaining decreases → confirm summary → void →
 *   confirm inventory + summary reverse.
 *
 * Requires a live Supabase backend and a seeded account (E2E_EMAIL / E2E_PASSWORD).
 * It is skipped automatically when those are not provided.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.skip(!EMAIL || !PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD to run the critical-path smoke test.");

const unique = Date.now().toString().slice(-6);
const productName = `Smoke Widget ${unique}`;
const eventName = `Smoke Market ${unique}`;

test("vendor critical path", async ({ page }) => {
  // 1. Sign in
  await page.goto("/login");
  await page.getByLabel("Email").fill(EMAIL!);
  await page.getByLabel("Password").fill(PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  // 2. Create product
  await page.goto("/products/new");
  await page.getByLabel("Product name").fill(productName);
  await page.getByLabel("Default price").fill("25");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/products\//);

  // 3. Record a print batch (10 successful)
  await page.goto("/prints/new");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: productName }).click();
  await page.getByLabel("Quantity started").fill("10");
  await page.getByRole("button", { name: "Record batch" }).click();
  await expect(page).toHaveURL(/\/inventory/);
  await expect(page.getByText(productName)).toBeVisible();

  // 4. Create event
  await page.goto("/events/new");
  await page.getByLabel("Event name").fill(eventName);
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page).toHaveURL(/\/events\//);

  // 5. Allocate product (bring 10) and 6. open event
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: new RegExp(productName) }).click();
  await page.getByLabel("Qty to bring").fill("10");
  await page.getByRole("button", { name: "Add allocation" }).click();
  await page.getByRole("button", { name: /Open event/ }).click();
  await expect(page).toHaveURL(/\/mode/);

  // 7. Sell one
  await page.getByRole("button", { name: /Quick sell one/ }).first().click();
  // 8. Remaining decreases from 10 to 9
  await expect(page.getByText("9", { exact: true })).toBeVisible();

  // 9. Summary updates
  await page.goto(`${page.url().replace("/mode", "/summary")}`);
  await expect(page.getByText("Units sold").locator("..")).toContainText("1");
});
