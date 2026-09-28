"use client";

import { CarFrontIcon, GaugeIcon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { FormSection } from "@/components/form-section";
import { StickyActions } from "@/components/sticky-actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/form";
import { initialActionState } from "@/lib/form";

type Defaults = { name?: string; make?: string; model?: string; year?: number | null; plate?: string | null };

type Props = {
  mode: "create" | "edit";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Defaults;
  today: string;
};

export function VehicleForm({ mode, action, defaults = {}, today }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  // Suggest a nickname from make + model until the user types their own.
  const suggestName = (form: HTMLFormElement) => {
    const name = nameRef.current;
    if (!name || name.dataset.touched) return;
    const make = (form.elements.namedItem("make") as HTMLInputElement).value.trim();
    const model = (form.elements.namedItem("model") as HTMLInputElement).value.trim();
    name.value = [make, model].filter(Boolean).join(" ");
  };

  return (
    <form
      action={formAction}
      className="grid gap-4"
      noValidate
      onChange={(ev) => mode === "create" && suggestName(ev.currentTarget)}
    >
      <FormMessage state={state} />
      <FormSection title="The car" icon={CarFrontIcon} index={0}>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="make" label="Make" error={e.make}>
            <Input {...fieldAria("make", e.make)} defaultValue={v.make ?? defaults.make} placeholder="Toyota" autoCapitalize="words" required />
          </FormField>
          <FormField id="model" label="Model" error={e.model}>
            <Input {...fieldAria("model", e.model)} defaultValue={v.model ?? defaults.model} placeholder="Avanza" autoCapitalize="words" required />
          </FormField>
        </div>
        <FormField id="name" label="Nickname" error={e.name} hint="How the car shows up in the app.">
          <Input
            {...fieldAria("name", e.name)}
            ref={nameRef}
            defaultValue={v.name ?? defaults.name}
            placeholder="Family car"
            onInput={(ev) => (ev.currentTarget.dataset.touched = "1")}
            required
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="year" label="Year" error={e.year}>
            <Input {...fieldAria("year", e.year)} inputMode="numeric" defaultValue={v.year ?? defaults.year ?? ""} placeholder="2026" />
          </FormField>
          <FormField id="plate" label="Plate" error={e.plate}>
            <Input
              {...fieldAria("plate", e.plate)}
              defaultValue={v.plate ?? defaults.plate ?? ""}
              placeholder="B 1234 XYZ"
              autoCapitalize="characters"
              className="font-mono tracking-wider uppercase"
            />
          </FormField>
        </div>
      </FormSection>
      {mode === "create" && (
        <FormSection
          title="Starting point"
          icon={GaugeIcon}
          description="Reminders count from this reading. Check your dashboard."
          index={1}
        >
          <FormField id="odometer" label="Current odometer (km)" error={e.odometer}>
            <Input
              {...fieldAria("odometer", e.odometer)}
              inputMode="numeric"
              defaultValue={v.odometer}
              placeholder="e.g. 1250"
              className="h-14 text-xl font-semibold tabular-nums"
              required
            />
          </FormField>
          <FormField id="trackedSince" label="Reading date" error={e.trackedSince}>
            <Input {...fieldAria("trackedSince", e.trackedSince)} type="date" max={today} defaultValue={v.trackedSince ?? today} required />
          </FormField>
        </FormSection>
      )}
      {mode === "create" ? (
        <StickyActions>
          <SubmitButton size="lg" className="w-full rounded-2xl" pendingText="Saving…">
            Add car
          </SubmitButton>
        </StickyActions>
      ) : (
        <SubmitButton size="lg" className="rounded-2xl" pendingText="Saving…">
          Save changes
        </SubmitButton>
      )}
    </form>
  );
}
