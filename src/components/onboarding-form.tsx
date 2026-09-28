"use client";

import { useActionState } from "react";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/form";
import { createHouseholdAction } from "@/server/actions/household";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, action] = useActionState(createHouseholdAction, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField id="displayName" label="Your name" error={e.displayName} hint="Shown to family members you invite.">
        <Input
          {...fieldAria("displayName", e.displayName)}
          autoComplete="given-name"
          defaultValue={state.values?.displayName ?? defaultName}
          placeholder="e.g. Sulthan"
          required
        />
      </FormField>
      <FormField id="householdName" label="Garage name" error={e.householdName}>
        <Input
          {...fieldAria("householdName", e.householdName)}
          defaultValue={state.values?.householdName ?? "Our garage"}
          required
        />
      </FormField>
      <SubmitButton size="lg" pendingText="Setting up…">
        Continue
      </SubmitButton>
    </form>
  );
}
