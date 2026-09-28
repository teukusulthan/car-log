import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";
import { safeCallbackPath } from "@/lib/auth-utils";
import { getSessionUser } from "@/server/access";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(typeof params.callbackUrl === "string" ? params.callbackUrl : null);
  if (await getSessionUser()) redirect(callbackUrl);

  return (
    <AuthShell
      title="Sign in to car-log"
      description="Enter your email and we'll send you a sign-in code. No password needed."
    >
      <LoginForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
