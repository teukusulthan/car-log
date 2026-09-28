"use client";

import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { MoneyInput } from "@/components/money-input";
import { PhotoPicker } from "@/components/photo-picker";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DueStatus } from "@/lib/due";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type ServiceFormState, saveServiceAction } from "@/server/actions/services";

export type ServiceFormItem = { id: string; name: string; status: DueStatus };

type Line = { key: string; maintenanceItemId: string | null; label: string; cost: string };

export type ServiceFormDefaults = {
  date: string;
  odometer: number;
  workshop?: string | null;
  notes?: string | null;
  totalCost?: number;
  lines?: { maintenanceItemId: string | null; label: string; cost: number | null }[];
};

type Props = {
  recordId: string | null;
  vehicleId: string;
  items: ServiceFormItem[];
  workshops: string[];
  defaults: ServiceFormDefaults;
  today: string;
  preselect?: string | null;
  doneHref: string;
};

let seq = 0;
const key = () => `line-${++seq}`;

export function ServiceForm({ recordId, vehicleId, items, workshops, defaults, today, preselect, doneHref }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState<ServiceFormState, FormData>(
    saveServiceAction.bind(null, recordId),
    {},
  );

  const [lines, setLines] = useState<Line[]>(() => {
    if (defaults.lines?.length) {
      return defaults.lines.map((l) => ({ key: key(), maintenanceItemId: l.maintenanceItemId, label: l.label, cost: l.cost?.toString() ?? "" }));
    }
    const pre = items.find((i) => i.id === preselect);
    return pre ? [{ key: key(), maintenanceItemId: pre.id, label: pre.name, cost: "" }] : [];
  });
  const [total, setTotal] = useState(defaults.totalCost ? String(defaults.totalCost) : "");
  const [totalTouched, setTotalTouched] = useState(Boolean(recordId));
  // The server asked to confirm an odd odometer value; editing date/odometer again withdraws that confirmation.
  const [withdrawnFor, setWithdrawnFor] = useState<ServiceFormState | null>(null);
  const confirmed = Boolean(state.needsConfirm) && withdrawnFor !== state;
  const withdrawConfirmation = () => setWithdrawnFor(state);

  const itemsSum = useMemo(() => lines.reduce((sum, l) => sum + (Number(l.cost) || 0), 0), [lines]);
  const effectiveTotal = totalTouched ? total : itemsSum ? String(itemsSum) : "";

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Saved");
      router.push(recordId ? `/history/${recordId}` : doneHref);
    }
  }, [state, router, recordId, doneHref]);

  const toggle = (item: ServiceFormItem) =>
    setLines((ls) =>
      ls.some((l) => l.maintenanceItemId === item.id)
        ? ls.filter((l) => l.maintenanceItemId !== item.id)
        : [...ls, { key: key(), maintenanceItemId: item.id, label: item.name, cost: "" }],
    );
  const updateLine = (k: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === k ? { ...l, ...patch } : l)));
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const payload = JSON.stringify(
    lines.map((l) => ({ maintenanceItemId: l.maintenanceItemId, label: l.label.trim(), cost: l.cost ? Number(l.cost) : null })),
  );
  const customLines = lines.filter((l) => !l.maintenanceItemId);
  const scheduledLines = lines.filter((l) => l.maintenanceItemId);

  return (
    <form
      action={formAction}
      className="grid gap-6"
      noValidate
      onSubmit={(ev) => {
        if (!navigator.onLine) {
          ev.preventDefault();
          toast.error("You're offline. Connect to the internet to save.");
        }
      }}
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="totalCost" value={effectiveTotal} />
      {confirmed && <input type="hidden" name="confirm" value="1" />}
      <FormMessage state={state.needsConfirm ? {} : state} />

      <div className="grid grid-cols-2 gap-3">
        <FormField id="date" label="Date" error={e.date}>
          <Input {...fieldAria("date", e.date)} type="date" max={today} defaultValue={v.date ?? defaults.date} onChange={withdrawConfirmation} required />
        </FormField>
        <FormField id="odometer" label="Odometer (km)" error={e.odometer}>
          <Input {...fieldAria("odometer", e.odometer)} inputMode="numeric" defaultValue={v.odometer ?? defaults.odometer} onChange={withdrawConfirmation} required />
        </FormField>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-1 font-semibold">What was done?</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Scheduled maintenance">
          {items.map((item) => {
            const selected = lines.some((l) => l.maintenanceItemId === item.id);
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(item)}
                className={cn(
                  "flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
                  selected ? "border-primary bg-primary text-primary-foreground" : "bg-card active:bg-muted",
                )}
              >
                {selected && <CheckIcon className="size-4" aria-hidden />}
                {item.name}
                {!selected && item.status !== "ok" && (
                  <span
                    aria-label={item.status === "overdue" ? "overdue" : "due soon"}
                    className={cn("size-2 rounded-full", item.status === "overdue" ? "bg-overdue" : "bg-due-soon")}
                  />
                )}
              </button>
            );
          })}
        </div>
        {e.items && <p role="alert" className="text-sm text-destructive">{e.items}</p>}

        {(scheduledLines.length > 0 || customLines.length > 0) && (
          <ul className="grid gap-2 rounded-2xl border bg-card p-3">
            {lines.map((line) => (
              <li key={line.key} className="flex items-center gap-2">
                {line.maintenanceItemId ? (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{line.label}</span>
                ) : (
                  <Input
                    aria-label="Work description"
                    placeholder="e.g. Wiper blades"
                    value={line.label}
                    onChange={(ev) => updateLine(line.key, { label: ev.target.value })}
                    className="h-10 flex-1"
                  />
                )}
                <MoneyInput
                  aria-label={`Cost of ${line.label || "item"}`}
                  placeholder="Cost"
                  value={line.cost}
                  onValueChange={(cost) => updateLine(line.key, { cost })}
                  className="h-10 w-36"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${line.label || "item"}`}
                  onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setLines((ls) => [...ls, { key: key(), maintenanceItemId: null, label: "", cost: "" }])}
        >
          <PlusIcon /> Add other work
        </Button>
      </fieldset>

      <FormField id="workshop" label="Workshop" error={e.workshop}>
        <Input
          {...fieldAria("workshop", e.workshop)}
          list="workshop-options"
          autoComplete="off"
          placeholder="e.g. Auto2000 Sunter"
          defaultValue={v.workshop ?? defaults.workshop ?? ""}
        />
        <datalist id="workshop-options">
          {workshops.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      </FormField>

      <FormField
        id="totalCostDisplay"
        label="Total paid"
        error={e.totalCost}
        hint={!totalTouched && itemsSum > 0 ? `Sum of item costs (${formatIDR(itemsSum)}). Edit if the bill was different.` : undefined}
      >
        <MoneyInput
          id="totalCostDisplay"
          value={effectiveTotal}
          placeholder="0"
          onValueChange={(digits) => {
            setTotalTouched(true);
            setTotal(digits);
          }}
        />
      </FormField>

      <PhotoPicker name="photos" label="Receipt photos" />

      <FormField id="notes" label="Notes" error={e.notes}>
        <Textarea {...fieldAria("notes", e.notes)} rows={3} placeholder="Anything worth remembering" defaultValue={v.notes ?? defaults.notes ?? ""} />
      </FormField>

      {state.needsConfirm && confirmed && (
        <p role="alert" className="rounded-lg bg-due-soon/15 px-3 py-2.5 text-sm">
          {state.message}
        </p>
      )}
      <SubmitButton size="lg" pendingText="Saving…">
        {state.needsConfirm && confirmed ? "Yes, save it" : recordId ? "Save changes" : "Save service"}
      </SubmitButton>
    </form>
  );
}
