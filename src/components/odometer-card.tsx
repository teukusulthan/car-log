"use client";

import { GaugeIcon, TriangleAlertIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { describeAgo, formatKm, formatNumber } from "@/lib/format";
import { type OdometerState, updateOdometerAction } from "@/server/actions/vehicles";

type Props = {
  vehicleId: string;
  currentKm: number;
  daysSinceReading: number | null;
  avgDailyKm: number | null;
  stale: boolean;
};

export function OdometerCard({ vehicleId, currentKm, daysSinceReading, avgDailyKm, stale }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <GaugeIcon className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Odometer</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatKm(currentKm)}</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant={stale ? "default" : "secondary"}>Update</Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-2xl pb-safe">
            <SheetHeader>
              <SheetTitle>Update odometer</SheetTitle>
              <SheetDescription>Enter the number on your dashboard. Last reading: {formatKm(currentKm)}.</SheetDescription>
            </SheetHeader>
            {open && <OdometerForm vehicleId={vehicleId} onDone={() => setOpen(false)} />}
          </SheetContent>
        </Sheet>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {daysSinceReading !== null && <span>Updated {describeAgo(daysSinceReading)}</span>}
        {avgDailyKm !== null && <span>· ~{formatNumber(avgDailyKm)} km/day</span>}
      </div>
      {stale && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-due-soon/15 px-3 py-2 text-sm">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-due-soon-foreground dark:text-due-soon" aria-hidden />
          Update your mileage to keep km-based reminders accurate.
        </p>
      )}
    </section>
  );
}

function OdometerForm({ vehicleId, onDone }: { vehicleId: string; onDone: () => void }) {
  const [state, action] = useActionState<OdometerState, FormData>(updateOdometerAction, {});
  const error = state.fieldErrors?.km;

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={action} className="grid gap-4 px-4 pb-4" noValidate>
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {state.needsConfirm && <input type="hidden" name="confirm" value="1" />}
      <FormField id="km" label="Kilometres" error={error}>
        <Input
          {...fieldAria("km", error)}
          inputMode="numeric"
          autoComplete="off"
          defaultValue={state.values?.km}
          className="h-14 text-2xl font-semibold tabular-nums"
          autoFocus
          required
        />
      </FormField>
      {state.needsConfirm && (
        <p role="alert" className="rounded-lg bg-due-soon/15 px-3 py-2.5 text-sm">
          {state.message}
        </p>
      )}
      <SubmitButton size="lg" pendingText="Saving…">
        {state.needsConfirm ? "Yes, save it" : "Save"}
      </SubmitButton>
    </form>
  );
}
