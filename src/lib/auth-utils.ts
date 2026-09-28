import { randomInt } from "node:crypto";
import { z } from "zod";

import { LOGIN_CODE_LENGTH } from "./auth-constants";

export { LOGIN_CODE_LENGTH, LOGIN_CODE_MAX_AGE_SECONDS } from "./auth-constants";

/** Cryptographically random numeric code; digits keep the iOS numeric keypad and Mail autofill. */
export function generateLoginCode(): string {
  return randomInt(0, 10 ** LOGIN_CODE_LENGTH)
    .toString()
    .padStart(LOGIN_CODE_LENGTH, "0");
}

const emailSchema = z.email();

export function normalizeEmail(input: string): string {
  const email = input.trim().toLowerCase();
  return emailSchema.parse(email);
}

/** Only allow redirects to paths on this site. */
export function safeCallbackPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
