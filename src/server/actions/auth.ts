"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { safeCallbackPath } from "@/lib/auth-utils";
import { type ActionState, parseForm } from "@/lib/form";
import { requireUser } from "@/server/access";
import { EmailTakenError, MIN_PASSWORD_LENGTH, changePassword, registerUser } from "@/server/credentials";

const email = z.string().trim().min(1, "Enter your email").pipe(z.email("That doesn't look like an email address"));
const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(200, "That password is too long");

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
  callbackUrl: z.string().optional(),
});

const signupSchema = z.object({
  name: z.string().trim().min(1, "Tell us what to call you").max(60),
  email,
  password: newPassword,
  callbackUrl: z.string().optional(),
});

/** Never echo passwords back into the form. */
const PASSWORD_FIELDS = new Set(["password", "currentPassword", "newPassword"]);
function withoutPasswords(state: ActionState): ActionState {
  if (!state.values) return state;
  const values = Object.fromEntries(Object.entries(state.values).filter(([key]) => !PASSWORD_FIELDS.has(key)));
  return { ...state, values };
}

async function signInOrError(emailValue: string, password: string, redirectTo: string): Promise<ActionState> {
  try {
    await signIn("credentials", { email: emailValue, password, redirectTo });
  } catch (error) {
    // A successful sign-in throws Next's redirect; let it through.
    if (!(error instanceof AuthError)) throw error;
    const locked = error instanceof CredentialsSignin && error.code === "locked";
    return {
      message: locked
        ? "Too many wrong attempts. For your security, this account is locked for 15 minutes."
        : "Email or password is incorrect.",
      values: { email: emailValue },
    };
  }
  return {};
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.success) return withoutPasswords(parsed.state);
  const { email: e, password, callbackUrl } = parsed.data;
  return signInOrError(e, password, safeCallbackPath(callbackUrl));
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(signupSchema, formData);
  if (!parsed.success) return withoutPasswords(parsed.state);
  const { name, email: e, password, callbackUrl } = parsed.data;
  try {
    await registerUser({ email: e, password, name });
  } catch (error) {
    if (error instanceof EmailTakenError) {
      return { fieldErrors: { email: "An account with this email already exists. Log in instead." }, values: { name, email: e } };
    }
    throw error;
  }
  // New accounts go through onboarding unless they came from an invite link.
  const target = safeCallbackPath(callbackUrl);
  return signInOrError(e, password, target === "/" ? "/onboarding" : target);
}

const changePasswordSchema = z.object({ currentPassword: z.string().min(1, "Enter your current password"), newPassword });

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(changePasswordSchema, formData);
  if (!parsed.success) return withoutPasswords(parsed.state);
  const ok = await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!ok) return { fieldErrors: { currentPassword: "That's not your current password" } };
  revalidatePath("/settings");
  return { ok: true, message: "Password changed" };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
