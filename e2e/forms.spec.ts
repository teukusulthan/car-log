import { expect, test } from "@playwright/test";
import { jakartaToday, signIn } from "./helpers";

async function newCar(page: import("@playwright/test").Page, km: string) {
  await signIn(page, `forms-${Date.now()}@example.com`);
  await page.getByLabel("Your name").fill("Rina");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Make").fill("Suzuki");
  await page.getByLabel("Model").fill("Ertiga");
  await page.getByLabel("Current odometer (km)").fill(km);
  await page.getByLabel("Reading date").fill(jakartaToday(-1));
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("heading", { name: "Suzuki Ertiga" })).toBeVisible();
}

test("the confirm prompt keeps what the user typed and saves exactly that", async ({ page }) => {
  await newCar(page, "50000");
  await page.goto("/log");
  await page.getByRole("button", { name: "Engine oil", exact: true }).click();
  await page.getByLabel("Odometer (km)").fill("4900");
  await page.getByLabel("Workshop").fill("Bengkel A");
  await page.getByRole("button", { name: "Save service" }).click();

  await expect(page.getByText(/lower than an earlier reading/)).toBeVisible();
  await expect(page.getByLabel("Odometer (km)")).toHaveValue("4900");
  await expect(page.getByLabel("Workshop")).toHaveValue("Bengkel A");

  await page.getByRole("button", { name: "Yes, save it" }).click();
  await expect(page.getByText("Service saved")).toBeVisible();
  await page.goto("/history");
  await expect(page.getByText("4.900 km · Bengkel A")).toBeVisible();
});

test("photos picked before a validation error are still saved", async ({ page }) => {
  await newCar(page, "1000");
  await page.goto("/log");
  await page.locator("input[type=file][name=photos]").setInputFiles("e2e/fixtures-receipt.jpg");
  await expect(page.getByRole("img", { name: "New photo 1" })).toBeVisible();
  await page.getByLabel("Notes").fill("Receipt first");
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Pick at least one thing that was done")).toBeVisible();
  await expect(page.getByLabel("Notes")).toHaveValue("Receipt first");

  await page.getByRole("button", { name: "Air filter", exact: true }).click();
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Service saved")).toBeVisible();
  await page.goto("/history");
  await page.getByRole("link", { name: /Air filter/ }).click();
  await expect(page.getByRole("img", { name: "Photo 1" })).toBeVisible();
});
