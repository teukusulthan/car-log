"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/form";
import { signupAction } from "@/server/actions/auth";

export function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(signupAction, initialActionState);
  const e = state.fieldErrors ?? {};
  const loginHref = callbackUrl === "/" ? "/login" : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-4" noValidate>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <FormMessage state={state.fieldErrors ? {} : state} />
        <FormField id="name" label="Your name" error={e.name} hint="Shown to family members in your garage.">
          <Input {...fieldAria("name", e.name)} autoComplete="given-name" defaultValue={state.values?.name} placeholder="e.g. Sulthan" required />
        </FormField>
        <FormField id="email" label="Email" error={e.email}>
          <Input
            {...fieldAria("email", e.email)}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@example.com"
            defaultValue={state.values?.email}
            required
          />
        </FormField>
        <FormField id="password" label="Password" error={e.password} hint="At least 8 characters.">
          <PasswordInput {...fieldAria("password", e.password)} autoComplete="new-password" required />
        </FormField>
        <SubmitButton size="lg" pendingText="Creating account…">
          Create account
        </SubmitButton>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
