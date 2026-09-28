import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";
import { safeCallbackPath } from "@/lib/auth-utils";
import { getSessionUser } from "@/server/access";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(typeof params.callbackUrl === "string" ? params.callbackUrl : null);
  if (await getSessionUser()) redirect(callbackUrl);

  return (
    <AuthShell title="Create your account" description="Track services, get reminders, and share the history with your family.">
      <SignupForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
