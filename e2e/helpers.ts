import { readFileSync } from "node:fs";
import { type Page, expect } from "@playwright/test";

export function jakartaToday(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page).toHaveURL(/check-email/);
  const { code } = JSON.parse(readFileSync(".dev/last-login.json", "utf8")) as { code: string; to: string };
  await page.getByLabel("Sign-in code").fill(code);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
