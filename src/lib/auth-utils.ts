import { z } from "zod";

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
