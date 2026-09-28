"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {rows.map((row, index) => (
          <li key={row.key} className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Item name"
                value={row.name}
                onChange={(e) => update(index, { name: e.target.value })}
                className="h-10 flex-1 font-medium"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${row.name || "item"}`}
                onClick={() => {
                  setRows((r) => r.filter((_, i) => i !== index));
                  setDirty(true);
                }}
              >
                <Trash2Icon className="text-muted-foreground" />
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <label className="grid gap-1">
                <span className="text-muted-foreground">Every (km)</span>
                <Input
                  inputMode="numeric"
                  value={row.intervalKm}
                  placeholder="—"
                  onChange={(e) => update(index, { intervalKm: e.target.value })}
                  className="h-10"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-muted-foreground">Every (months)</span>
                <Input
                  inputMode="numeric"
                  value={row.intervalMonths}
                  placeholder="—"
                  onChange={(e) => update(index, { intervalMonths: e.target.value })}
                  className="h-10"
                />
              </label>
            </div>
            {errors[index] && <p className="mt-2 text-sm text-destructive">{errors[index]}</p>}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setRows((r) => [...r, { key: newKey(), name: "", intervalKm: "", intervalMonths: "" }]);
          setDirty(true);
        }}
      >
        <PlusIcon /> Add item
      </Button>
      <Button type="button" size="lg" onClick={save} disabled={!dirty || pending}>
        {pending ? "Saving…" : "Save schedule"}
      </Button>
    </div>
  );
}
