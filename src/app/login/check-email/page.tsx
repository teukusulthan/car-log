import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { CodeForm } from "@/components/code-form";
import { EMAIL_PROVIDER_ID } from "@/auth";
import { readPendingLogin } from "@/server/login-state";

export const metadata: Metadata = { title: "Enter your code" };

const ERRORS: Record<string, string> = {
  Verification: "That code is wrong or has expired. Check the latest email, or send a new code.",
  Configuration: "Something went wrong signing you in. Please request a new code.",
};

export default async function CheckEmailPage({ searchParams }: PageProps<"/login/check-email">) {
  const params = await searchParams;
  const pending = await readPendingLogin();
  if (!pending) redirect("/login");

  const errorKey = typeof params.error === "string" ? params.error : null;
  const error = errorKey ? (ERRORS[errorKey] ?? ERRORS.Configuration) : null;
  const notice = params.resent === "wait" ? "We just sent a code — please wait 30 seconds before asking for another." : null;

  return (
    <AuthShell
      title="Check your email"
      description={
        <>
          We sent an 8-digit code to <span className="font-medium text-foreground">{pending.email}</span>. It
          expires in 10 minutes.
        </>
      }
    >
      <CodeForm
        providerId={EMAIL_PROVIDER_ID}
        email={pending.email}
        callbackUrl={pending.callbackUrl}
        error={error}
        notice={notice}
      />
      <p className="text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Use a different one
        </Link>
      </p>
    </AuthShell>
  );
}
