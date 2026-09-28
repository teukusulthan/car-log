"use client";

import { useActionState } from "react";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { initialActionState } from "@/lib/form";
import { createHouseholdAction } from "@/server/actions/household";

export function OnboardingForm() {
  const [state, action] = useActionState(createHouseholdAction, initialActionState);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormField
        id="householdName"
        label="Name your garage"
        error={e.householdName}
        hint="Everyone you invite shares this garage — its cars, history and reminders."
      >
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
