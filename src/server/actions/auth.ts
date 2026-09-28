"use server";

import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EMAIL_PROVIDER_ID, signIn, signOut } from "@/auth";
import { db, schema } from "@/db";
import { LOGIN_CODE_MAX_AGE_SECONDS, normalizeEmail, safeCallbackPath } from "@/lib/auth-utils";
import { type ActionState, parseForm } from "@/lib/form";
import { LOGIN_COOKIE, type PendingLogin } from "@/server/login-state";

const RESEND_COOLDOWN_SECONDS = 30;

const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email").pipe(z.email("That doesn't look like an email address")),
  callbackUrl: z.string().optional(),
});
async function sentRecently(email: string) {
  // Tokens expire LOGIN_CODE_MAX_AGE after creation, so "expires > now + maxAge - cooldown" means "created < cooldown ago".
  const threshold = new Date(Date.now() + (LOGIN_CODE_MAX_AGE_SECONDS - RESEND_COOLDOWN_SECONDS) * 1000);
  const [row] = await db
    .select({ token: schema.verificationTokens.token })
    .from(schema.verificationTokens)
    .where(and(eq(schema.verificationTokens.identifier, email), gt(schema.verificationTokens.expires, threshold)))
    .limit(1);
  return Boolean(row);
}

export async function requestLoginCode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) return parsed.state;
  const email = normalizeEmail(parsed.data.email);
  const callbackUrl = safeCallbackPath(parsed.data.callbackUrl);

  if (await sentRecently(email)) {
    await rememberPendingLogin({ email, callbackUrl });
    redirect("/login/check-email?resent=wait");
  }

  try {
    await signIn(EMAIL_PROVIDER_ID, { email, redirect: false, redirectTo: callbackUrl });
  } catch (error) {
    console.error("[auth] failed to send login code", error);
    return {
      message: "We couldn't send the email right now. Please try again in a minute.",
      values: { email },
    };
  }
  await rememberPendingLogin({ email, callbackUrl });
  redirect("/login/check-email");
}

async function rememberPendingLogin(pending: PendingLogin) {
  (await cookies()).set(LOGIN_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LOGIN_CODE_MAX_AGE_SECONDS + 5 * 60,
    path: "/",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
