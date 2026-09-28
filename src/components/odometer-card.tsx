"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { type OdometerState, updateOdometerAction } from "@/server/actions/vehicles";

export function OdometerForm({ vehicleId, currentKm, onDone }: { vehicleId: string; currentKm: number; onDone: () => void }) {
  const [state, action] = useActionState<OdometerState, FormData>(updateOdometerAction, {});
  const error = state.fieldErrors?.km;
  const [km, setKm] = useState(state.values?.km ?? "");
  // The "save anyway" confirmation only applies to the exact number the server questioned.
  const confirmed = Boolean(state.needsConfirm) && km === state.values?.km;

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={action} className="grid gap-4 px-4 pb-4" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {confirmed && <input type="hidden" name="confirm" value="1" />}
      <FormField id="km" label="Kilometres" error={error}>
        <Input
          {...fieldAria("km", error)}
          inputMode="numeric"
          autoComplete="off"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder={formatNumber(currentKm)}
          className="h-16 rounded-2xl text-3xl font-semibold tabular-nums"
          autoFocus
          required
        />
      </FormField>
      <div className="flex flex-wrap gap-2" aria-label="Quick add">
        {[50, 100, 250, 500].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setKm(String((Number(km.replace(/\D/g, "")) || currentKm) + d))}
            className="pressable h-9 rounded-full bg-muted px-3.5 text-sm font-medium"
          >
            +{d} km
          </button>
        ))}
      </div>
      {confirmed && (
        <p role="alert" className="rounded-lg bg-due-soon/15 px-3 py-2.5 text-sm">
          {state.message}
        </p>
      )}
      <SubmitButton size="lg" pendingText="Saving…">
        {confirmed ? "Yes, save it" : "Save"}
      </SubmitButton>
    </form>
  );
}
