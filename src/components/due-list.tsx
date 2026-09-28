import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { DueProgress } from "@/components/due-progress";
import { MaintenanceIcon } from "@/components/maintenance-icon";
import { StatusBadge } from "@/components/status-badge";
import type { ISODate } from "@/lib/dates";
import { describeDue, formatDate, formatKm } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VehicleStatusItem } from "@/server/queries/vehicles";

export type DueItem = VehicleStatusItem & { progress: number };

export function dueDetail(item: VehicleStatusItem) {
  const limits: string[] = [];
  if (item.due.dueKm !== null) limits.push(formatKm(item.due.dueKm));
  if (item.due.dueDate) limits.push(formatDate(item.due.dueDate));
  const last = item.last ? `Last done ${formatDate(item.last.date)}` : "Not logged yet";
  return limits.length ? `${last} · due ${limits.join(" or ")}` : last;
}

/** Full-width row for items that need attention. */
export function DueRow({ item, today, index = 0 }: { item: DueItem; today: ISODate; index?: number }) {
  const status = item.due.status;
  return (
    <li className="rise-in" style={{ ["--i" as string]: index }}>
      <Link
        href={`/log?item=${item.id}`}
        className="pressable flex items-center gap-3.5 rounded-3xl bg-card p-4 shadow-soft active:bg-muted/60"
        aria-label={`${item.name}: ${describeDue(item.due, today)}. Log this service.`}
      >
        <MaintenanceIcon name={item.name} tone={status} />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{item.name}</p>
            <StatusBadge tone={status} />
          </div>
          <p className="text-sm font-medium">{describeDue(item.due, today)}</p>
          <DueProgress value={item.progress} tone={status} index={index} />
          <p className="truncate text-xs text-muted-foreground">{dueDetail(item)}</p>
        </div>
        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground/70" aria-hidden />
      </Link>
    </li>
  );
}

/** Compact tile for items that are on track. */
export function DueTile({ item, today, index = 0 }: { item: DueItem; today: ISODate; index?: number }) {
  return (
    <li className="rise-in" style={{ ["--i" as string]: index }}>
      <Link
        href={`/log?item=${item.id}`}
        className="pressable flex h-full flex-col gap-3 rounded-3xl bg-card p-4 shadow-soft active:bg-muted/60"
        aria-label={`${item.name}: ${describeDue(item.due, today)}. Log this service.`}
      >
        <MaintenanceIcon name={item.name} tone="neutral" className="size-9 rounded-xl" />
        <div className="grid gap-0.5">
          <p className="line-clamp-1 text-[15px] font-semibold">{item.name}</p>
          <p className={cn("line-clamp-2 text-xs text-muted-foreground")}>{describeDue(item.due, today)}</p>
        </div>
        <DueProgress value={item.progress} tone="ok" index={index} className="mt-auto" />
      </Link>
    </li>
  );
}
