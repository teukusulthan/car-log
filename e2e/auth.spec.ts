import { expect, test } from "@playwright/test";
import { PASSWORD, logIn, signUp } from "./helpers";

test("sign up, log out, and log back in with email and password", async ({ page }) => {
  const email = `auth-${Date.now()}@example.com`;
  await signUp(page, email, "Sari");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await logIn(page, email, "not-my-password");
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);

  await logIn(page, email.toUpperCase(), PASSWORD);
  await expect(page.getByRole("heading", { name: "Add your car" })).toBeVisible();
});

test("signing up twice with the same email is refused", async ({ page, browser }) => {
  const email = `dupe-${Date.now()}@example.com`;
  await signUp(page, email);
  const other = await browser.newPage();
  await other.goto("/signup");
  await other.getByLabel("Your name").fill("Someone");
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password", { exact: true }).fill("another-pass-1");
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(other.getByText(/already exists/)).toBeVisible();
  await other.close();
});

test("a deep link opened while signed out lands on that screen after logging in", async ({ page }) => {
  const email = `deeplink-${Date.now()}@example.com`;
  await signUp(page, email, "Dian");
  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/documents?from=push");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdocuments%3Ffrom%3Dpush$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/documents\?from=push$/);
});
