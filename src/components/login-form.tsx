"use client";

import { useActionState } from "react";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/form";
import { requestLoginCode } from "@/server/actions/auth";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action] = useActionState(requestLoginCode, initialActionState);
  const error = state.fieldErrors?.email;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormMessage state={state.fieldErrors ? {} : state} />
      <FormField id="email" label="Email" error={error}>
        <Input
          {...fieldAria("email", error)}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          autoFocus
          required
        />
      </FormField>
      <SubmitButton size="lg" pendingText="Sending code…">
        Send me a code
      </SubmitButton>
    </form>
  );
}
