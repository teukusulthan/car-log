"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOGIN_CODE_LENGTH } from "@/lib/auth-constants";
import { initialActionState } from "@/lib/form";
import { requestLoginCode } from "@/server/actions/auth";

type Props = { providerId: string; email: string; callbackUrl: string; error: string | null; notice: string | null };

export function CodeForm({ providerId, email, callbackUrl, error, notice }: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendState, resend] = useActionState(requestLoginCode, initialActionState);
  const ready = code.length === LOGIN_CODE_LENGTH;

  return (
    <div className="grid gap-4">
      {/* A plain GET form: Auth.js verifies the code at its callback URL and sets the session cookie in this app. */}
      <form
        action={`/api/auth/callback/${providerId}`}
        method="get"
        className="grid gap-4"
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {notice && <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">{notice}</p>}
        <FormField id="token" label="Sign-in code" error={error ?? undefined}>
          <Input
            id="token"
            name="token"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, LOGIN_CODE_LENGTH))}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`\\d{${LOGIN_CODE_LENGTH}}`}
            maxLength={LOGIN_CODE_LENGTH}
            placeholder="12345678"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "token-error" : undefined}
            className="h-14 text-center font-mono text-2xl tracking-[0.35em]"
            autoFocus
            required
          />
        </FormField>
        <Button type="submit" size="lg" disabled={!ready || submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <form action={resend}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {resendState.message && <p className="mb-2 text-center text-sm text-destructive">{resendState.message}</p>}
        <SubmitButton variant="ghost" className="w-full" pendingText="Sending…">
          Send a new code
        </SubmitButton>
      </form>
    </div>
  );
}
