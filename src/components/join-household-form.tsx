"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/form";
import { acceptInviteAction } from "@/server/actions/household";

export function JoinHouseholdForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, action] = useActionState(acceptInviteAction, initialActionState);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <FormField id="displayName" label="Your name" hint="So your family knows who logged what.">
        <Input id="displayName" name="displayName" autoComplete="given-name" defaultValue={defaultName} />
      </FormField>
      <SubmitButton size="lg" pendingText="Joining…">
        Join garage
      </SubmitButton>
    </form>
  );
}
