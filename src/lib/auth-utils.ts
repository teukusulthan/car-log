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
  if (!value || !value.startsWith("/")) return "/";
  // Resolve the way a browser would (it strips tabs/newlines and treats "\\" as "/"); keep it only if it stays on our origin.
  const base = "http://car-log.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base || /[\t\n\r\\]/.test(value)) return "/";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}
