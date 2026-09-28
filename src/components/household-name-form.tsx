"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { type ActionState, initialActionState } from "@/lib/form";
import { renameHouseholdAction } from "@/server/actions/household";

export function HouseholdNameForm({ name }: { name: string }) {
  const [state, action] = useActionState<ActionState, FormData>(renameHouseholdAction, initialActionState);
  useEffect(() => {
    if (state.ok) toast.success("Garage renamed");
  }, [state]);
  const error = state.fieldErrors?.householdName;
  return (
    <form action={action} className="flex items-start gap-2">
      <div className="grid flex-1 gap-1">
        <Input name="householdName" aria-label="Garage name" defaultValue={state.values?.householdName ?? name} aria-invalid={error ? true : undefined} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <SubmitButton variant="secondary">Save</SubmitButton>
    </form>
  );
}
