"use client";

import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaintenanceIcon } from "@/components/maintenance-icon";
import { saveScheduleAction } from "@/server/actions/vehicles";

type Row = { key: string; id?: string; name: string; intervalKm: string; intervalMonths: string };
export type ScheduleEditorItem = { id: string; name: string; intervalKm: number | null; intervalMonths: number | null };

let seq = 0;
const newKey = () => `new-${++seq}`;

export function ScheduleEditor({ vehicleId, items }: { vehicleId: string; items: ScheduleEditorItem[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    items.map((i) => ({
      key: i.id,
      id: i.id,
      name: i.name,
      intervalKm: i.intervalKm?.toString() ?? "",
      intervalMonths: i.intervalMonths?.toString() ?? "",
    })),
  );
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (index: number, patch: Partial<Row>) => {
    setRows((r) => r.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setDirty(true);
  };

  const save = () =>
    startTransition(async () => {
      const result = await saveScheduleAction(
        vehicleId,
        rows.map(({ id, name, intervalKm, intervalMonths }) => ({ id, name, intervalKm, intervalMonths })),
      );
      if (result.ok) {
        setErrors({});
        setDirty(false);
        toast.success("Schedule saved");
      } else {
        setErrors(result.itemErrors ?? {});
        toast.error(result.message);
      }
    });

  const summary = (row: Row) => {
    const parts = [
      row.intervalKm && `${Number(row.intervalKm.replace(/\D/g, "")).toLocaleString("id-ID")} km`,
      row.intervalMonths && `${row.intervalMonths} month${row.intervalMonths === "1" ? "" : "s"}`,
    ].filter(Boolean);
    return parts.length ? `Every ${parts.join(" or ")}` : "No interval set";
  };

  return (
    <div className="grid gap-3">
      <ul className="divide-y divide-border/70 overflow-hidden rounded-[24px] bg-card shadow-soft">
        {rows.map((row, index) => (
          <li key={row.key}>
            <details className="group" open={Boolean(errors[index]) || row.key.startsWith("new-") || undefined}>
              <summary className="pressable flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 active:bg-muted/60 [&::-webkit-details-marker]:hidden">
                <MaintenanceIcon name={row.name} tone="primary" className="size-9 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.name || "New item"}</p>
                  <p className={errors[index] ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                    {errors[index] ?? summary(row)}
                  </p>
                </div>
                <ChevronDownIcon className="size-4 text-muted-foreground/60 transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <div className="grid gap-3 px-4 pb-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Name</span>
                  <Input value={row.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="e.g. Wiper blades" />
                </label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label className="grid gap-1.5">
                    <span className="font-medium">Every (km)</span>
                    <Input inputMode="numeric" value={row.intervalKm} placeholder="—" onChange={(e) => update(index, { intervalKm: e.target.value })} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="font-medium">Every (months)</span>
                    <Input inputMode="numeric" value={row.intervalMonths} placeholder="—" onChange={(e) => update(index, { intervalMonths: e.target.value })} />
                  </label>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-self-start text-destructive"
                  onClick={() => {
                    setRows((r) => r.filter((_, i) => i !== index));
                    setDirty(true);
                  }}
                >
                  <Trash2Icon /> Remove {row.name || "item"}
                </Button>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="rounded-2xl border-dashed"
        onClick={() => {
          setRows((r) => [...r, { key: newKey(), name: "", intervalKm: "", intervalMonths: "" }]);
          setDirty(true);
        }}
      >
        <PlusIcon /> Add item
      </Button>
      {dirty && (
        <div className="rise-in sticky bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-30">
          <Button type="button" size="lg" className="w-full rounded-2xl shadow-lift" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save schedule"}
          </Button>
        </div>
      )}
    </div>
  );
}
