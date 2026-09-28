"use client";

import { Trash2Icon, WrenchIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate, formatKm } from "@/lib/format";
import { deleteReadingAction } from "@/server/actions/vehicles";

type Reading = { id: string; km: number; date: string; serviceRecordId: string | null };

/** Recent odometer readings; manual ones can be deleted to fix typos. */
export function ReadingList({ readings }: { readings: Reading[] }) {
  const [pending, startTransition] = useTransition();
  const deletable = readings.length > 1;
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {readings.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="font-medium tabular-nums">{formatKm(r.km)}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(r.date)}
              {r.serviceRecordId && " · from a service"}
            </p>
          </div>
          {r.serviceRecordId ? (
            <WrenchIcon className="size-4 text-muted-foreground" aria-label="Recorded with a service" />
          ) : (
            deletable && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete reading ${formatKm(r.km)} on ${formatDate(r.date)}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    if (!window.confirm(`Delete the ${formatKm(r.km)} reading?`)) return;
                    const res = await deleteReadingAction(r.id);
                    if (res.ok) toast.success("Reading deleted");
                    else toast.error(res.error);
                  })
                }
              >
                <Trash2Icon className="text-muted-foreground" />
              </Button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}
