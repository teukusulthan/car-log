"use client";

import { CalendarDaysIcon, CheckIcon, PlusIcon, ReceiptTextIcon, WalletIcon, WrenchIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { ExistingPhotos } from "@/components/existing-photos";
import { FormMessage } from "@/components/form-message";
import { FormSection } from "@/components/form-section";
import { MaintenanceIcon } from "@/components/maintenance-icon";
import { StickyActions } from "@/components/sticky-actions";
import { MoneyInput } from "@/components/money-input";
import { PhotoPicker } from "@/components/photo-picker";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { DueStatus } from "@/lib/due";
import { addDays } from "@/lib/dates";
import { formatIDR, formatKm } from "@/lib/format";
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
  photos?: { id: string }[];
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
  const [savedPhotoCount, setSavedPhotoCount] = useState(defaults.photos?.length ?? 0);
  const [total, setTotal] = useState(defaults.totalCost ? String(defaults.totalCost) : "");
  const [totalTouched, setTotalTouched] = useState(Boolean(recordId));
  // The server asked to confirm an odd odometer value; editing date/odometer again withdraws that confirmation.
  const [withdrawnFor, setWithdrawnFor] = useState<ServiceFormState | null>(null);
  const confirmed = Boolean(state.needsConfirm) && withdrawnFor !== state;
  const withdrawConfirmation = () => setWithdrawnFor(state);
  const [date, setDate] = useState(defaults.date);
  const [odometer, setOdometer] = useState(String(defaults.odometer));

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
  const yesterday = addDays(today, -1);
  const selectedCount = lines.length;

  return (
    <form
      action={formAction}
      className="grid gap-4"
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

      <FormSection title="When" icon={CalendarDaysIcon} index={0}>
        <div className="flex gap-2" role="group" aria-label="Pick today or yesterday">
          {[
            { label: "Today", value: today },
            { label: "Yesterday", value: yesterday },
          ].map((d) => (
            <button
              key={d.label}
              type="button"
              aria-pressed={date === d.value}
              onClick={() => {
                setDate(d.value);
                withdrawConfirmation();
              }}
              className={cn(
                "pressable h-9 rounded-full px-4 text-sm font-medium",
                date === d.value ? "bg-foreground text-background" : "bg-muted text-foreground",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="date" label="Date" error={e.date}>
            <Input
              {...fieldAria("date", e.date)}
              type="date"
              max={today}
              value={date}
              onChange={(ev) => {
                setDate(ev.target.value);
                withdrawConfirmation();
              }}
              required
            />
          </FormField>
          <FormField id="odometer" label="Odometer (km)" error={e.odometer}>
            <Input
              {...fieldAria("odometer", e.odometer)}
              inputMode="numeric"
              value={odometer}
              onChange={(ev) => {
                setOdometer(ev.target.value);
                withdrawConfirmation();
              }}
              className="tabular-nums"
              required
            />
          </FormField>
        </div>
        {!recordId && <p className="-mt-2 text-xs text-muted-foreground">Last reading: {formatKm(defaults.odometer)}</p>}
      </FormSection>

      <FormSection
        title="What was done?"
        icon={WrenchIcon}
        description={selectedCount ? `${selectedCount} selected` : "Tap everything the workshop did"}
        index={1}
      >
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
                  "pressable flex min-h-11 items-center gap-2 rounded-2xl border py-1.5 pr-3.5 pl-1.5 text-sm font-medium transition-colors",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl transition-colors",
                    selected ? "bg-white/20" : "bg-muted",
                  )}
                >
                  {selected ? <CheckIcon className="size-4" /> : <MaintenanceIcon name={item.name} className="size-8 rounded-xl bg-transparent" />}
                </span>
                {item.name}
                {!selected && item.status !== "ok" && (
                  <span aria-hidden className={cn("size-2 rounded-full", item.status === "overdue" ? "bg-overdue" : "bg-due-soon")} />
                )}
              </button>
            );
          })}
        </div>
        {e.items && (
          <p role="alert" className="text-sm text-destructive">
            {e.items}
          </p>
        )}

        {lines.length > 0 && (
          <ul className="grid gap-2">
            {lines.map((line) => (
              <li key={line.key} className="rise-in flex items-center gap-2 rounded-2xl bg-muted/60 p-1.5 pl-3">
                {line.maintenanceItemId ? (
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{line.label}</span>
                ) : (
                  <Input
                    aria-label="Work description"
                    placeholder="e.g. Wiper blades"
                    value={line.label}
                    onChange={(ev) => updateLine(line.key, { label: ev.target.value })}
                    className="h-10 flex-1"
                    autoFocus
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
          className="rounded-2xl border-dashed"
          onClick={() => setLines((ls) => [...ls, { key: key(), maintenanceItemId: null, label: "", cost: "" }])}
        >
          <PlusIcon /> Add other work
        </Button>
      </FormSection>

      <FormSection title="Where & how much" icon={WalletIcon} index={2}>
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
        {workshops.length > 0 && (
          <div className="-mt-1 flex flex-wrap gap-1.5" aria-label="Recently used">
            {workshops.slice(0, 3).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  const input = document.getElementById("workshop") as HTMLInputElement | null;
                  if (input) input.value = w;
                }}
                className="pressable h-8 rounded-full bg-muted px-3 text-xs font-medium"
              >
                {w}
              </button>
            ))}
          </div>
        )}
        <FormField
          id="totalCostDisplay"
          label="Total paid"
          error={e.totalCost}
          hint={!totalTouched && itemsSum > 0 ? "Adds up the item costs. Edit it if the bill was different." : undefined}
        >
          <MoneyInput
            id="totalCostDisplay"
            value={effectiveTotal}
            placeholder="0"
            onValueChange={(digits) => {
              setTotalTouched(true);
              setTotal(digits);
            }}
            className="text-lg font-semibold"
          />
        </FormField>
      </FormSection>

      <FormSection title="Receipt & notes" icon={ReceiptTextIcon} index={3}>
        <div className="grid gap-2">
          <PhotoPicker name="photos" label="Receipt photos" existingCount={savedPhotoCount} />
          {defaults.photos && <ExistingPhotos photos={defaults.photos} onCountChange={setSavedPhotoCount} />}
        </div>
        <FormField id="notes" label="Notes" error={e.notes}>
          <Textarea {...fieldAria("notes", e.notes)} rows={3} placeholder="Anything worth remembering" defaultValue={v.notes ?? defaults.notes ?? ""} />
        </FormField>
      </FormSection>

      {state.needsConfirm && confirmed && (
        <p role="alert" className="rise-in rounded-2xl bg-due-soon/20 px-4 py-3 text-sm font-medium">
          {state.message}
        </p>
      )}

      <StickyActions
        summary={
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">{selectedCount ? `${selectedCount} item${selectedCount === 1 ? "" : "s"}` : "Nothing selected"}</p>
            <p className="truncate font-semibold tabular-nums">{formatIDR(Number(effectiveTotal) || 0)}</p>
          </div>
        }
      >
        <SubmitButton size="lg" className="rounded-2xl px-6" pendingText="Saving…">
          {state.needsConfirm && confirmed ? "Yes, save it" : recordId ? "Save changes" : "Save service"}
        </SubmitButton>
      </StickyActions>
    </form>
  );
}
