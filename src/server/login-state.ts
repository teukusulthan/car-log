import "server-only";
import { cookies } from "next/headers";
import { normalizeEmail, safeCallbackPath } from "@/lib/auth-utils";

export const LOGIN_COOKIE = "cl_login";

export type PendingLogin = { email: string; callbackUrl: string };

/** The email/callback remembered between "send code" and "enter code" (httpOnly cookie). */
export async function readPendingLogin(): Promise<PendingLogin | null> {
  const raw = (await cookies()).get(LOGIN_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingLogin;
    return { email: normalizeEmail(parsed.email), callbackUrl: safeCallbackPath(parsed.callbackUrl) };
  } catch {
    return null;
  }
}
