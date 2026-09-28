import { expect, test } from "@playwright/test";
import { signUp } from "./helpers";

test("a tab opened in-app is available offline later", async ({ page, context }) => {
  await signUp(page, `offline-${Date.now()}@example.com`, "Dewi");
  await page.getByLabel("Make").fill("Daihatsu");
  await page.getByLabel("Model").fill("Xenia");
  await page.getByLabel("Current odometer (km)").fill("3000");
  await page.getByRole("button", { name: "Add car" }).click();
  await expect(page.getByRole("heading", { name: "Daihatsu Xenia" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);

  // Client-side navigation only (no full page load of /history).
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByText("Service history")).toBeVisible();
  await page.waitForTimeout(1500); // give the service worker time to store the page

  await context.setOffline(true);
  await page.goto("/history");
  await expect(page.getByText("Service history")).toBeVisible();
  await expect(page.getByText(/Offline — showing saved data/)).toBeVisible();
});
