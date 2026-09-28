import { expect, test } from "@playwright/test";
import { jakartaToday, signUp } from "./helpers";

test("a new user tracks a car from sign-up to reminders", async ({ page }) => {
  await signUp(page, `e2e-${Date.now()}@example.com`);
  await page.getByLabel("Make").fill("Toyota");
  await page.getByLabel("Model").fill("Avanza");
  await expect(page.getByLabel("Nickname")).toHaveValue("Toyota Avanza");
  await page.getByLabel("Current odometer (km)").fill("5.000");
  await page.getByLabel("Reading date").fill(jakartaToday(-200));
  await page.getByRole("button", { name: "Add car" }).click();

  // Home shows the seeded schedule; oil is overdue after 200 days
  await expect(page.getByRole("heading", { name: "Toyota Avanza" })).toBeVisible();
  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention.getByText("Engine oil")).toBeVisible();

  // Log an oil change from the overdue row
  await attention.getByRole("link", { name: /Engine oil/ }).click();
  await expect(page).toHaveURL(/\/log\?item=/);
  await expect(page.getByRole("button", { name: "Engine oil", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Odometer (km)").fill("9800");
  await page.getByLabel("Cost of Engine oil").fill("450000");
  await page.getByLabel("Workshop").fill("Bengkel Jaya");
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Service saved")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // Oil is no longer due; the next change is ~6 months away
  const upcoming = page.getByRole("region", { name: "Coming up" });
  await expect(upcoming.getByRole("link", { name: /Engine oil: In 10\.000 km or 6 months/ })).toBeVisible();

  // A lower odometer reading must be confirmed
  await page.getByRole("button", { name: "Update" }).click();
  await page.getByLabel("Kilometres").fill("9000");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog").getByText(/lower than a previous reading/)).toBeVisible();
  await page.getByRole("dialog").getByLabel("Kilometres").fill("10200");
  await page.getByRole("dialog").getByRole("button", { name: "Yes, save it" }).click();
  await expect(page.getByText("Odometer updated to 10.200 km")).toBeVisible();

  // History shows the visit and the spend
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("Rp 450.000").first()).toBeVisible();
  await page.getByRole("link", { name: /Engine oil/ }).click();
  await expect(page.getByText("Bengkel Jaya")).toBeVisible();

  // Insurance expiring in 10 days shows up on Home
  await page.goto("/documents/new");
  await page.getByLabel("Expires on").fill(jakartaToday(10));
  await page.getByRole("button", { name: "Add document" }).click();
  await expect(page).toHaveURL(/\/documents$/);
  await page.getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("region", { name: "Needs attention" }).getByText("Car insurance")).toBeVisible();
  await expect(page.getByText("Expires in 10 days")).toBeVisible();
});

test("pages require sign-in and other households' records are not found", async ({ page, browser }) => {
  await page.goto("/history");
  await expect(page).toHaveURL(/\/login/);

  await signUp(page, `owner-${Date.now()}@example.com`, "Owner");
  await page.getByLabel("Make").fill("Honda");
  await page.getByLabel("Model").fill("Brio");
  await page.getByLabel("Current odometer (km)").fill("100");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("heading", { name: "Honda Brio" })).toBeVisible();
  await page.goto("/log");
  await page.getByRole("button", { name: "Air filter", exact: true }).click();
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByText("Service saved")).toBeVisible();
  await page.goto("/history");
  await page.getByRole("link", { name: /Air filter/ }).click();
  await expect(page).toHaveURL(/\/history\/[0-9a-f-]{36}$/);
  const recordUrl = page.url();

  const other = await browser.newPage();
  await signUp(other, `intruder-${Date.now()}@example.com`, "Intruder");
  // The not-found UI renders (status may be 200 once streaming has started) and nothing from the record leaks.
  await other.goto(recordUrl);
  await expect(other.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(other.getByText("Air filter")).toHaveCount(0);
  await other.close();
});
