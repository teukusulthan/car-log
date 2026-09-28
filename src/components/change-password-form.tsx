"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { type ActionState, initialActionState } from "@/lib/form";
import { changePasswordAction } from "@/server/actions/auth";

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Password changed");
  }, [state]);
  return (
    <form ref={formRef} action={action} className="grid gap-3" noValidate>
      <FormField id="currentPassword" label="Current password" error={e.currentPassword}>
        <PasswordInput {...fieldAria("currentPassword", e.currentPassword)} autoComplete="current-password" />
      </FormField>
      <FormField id="newPassword" label="New password" error={e.newPassword} hint="At least 8 characters.">
        <PasswordInput {...fieldAria("newPassword", e.newPassword)} autoComplete="new-password" />
      </FormField>
      <SubmitButton variant="secondary" pendingText="Saving…">
        Change password
      </SubmitButton>
    </form>
  );
}
