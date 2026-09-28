import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { ISODate } from "@/lib/dates";
import { describeDue, formatDate, formatKm } from "@/lib/format";
import type { VehicleStatusItem } from "@/server/queries/vehicles";

function detail(item: VehicleStatusItem) {
  const limits: string[] = [];
  if (item.due.dueKm !== null) limits.push(`at ${formatKm(item.due.dueKm)}`);
  if (item.due.dueDate) limits.push(`by ${formatDate(item.due.dueDate)}`);
  const last = item.last ? `Last done ${formatDate(item.last.date)}` : "Not logged yet";
  return limits.length ? `${last} · due ${limits.join(" or ")}` : last;
}

export function DueRow({ item, today }: { item: VehicleStatusItem; today: ISODate }) {
  return (
    <li>
      <Link
        href={`/log?item=${item.id}`}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted"
        aria-label={`${item.name}: ${describeDue(item.due, today)}. Log this service.`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{item.name}</p>
            {item.due.status !== "ok" && <StatusBadge tone={item.due.status} />}
          </div>
          <p className={item.due.status === "ok" ? "text-sm text-muted-foreground" : "text-sm font-medium"}>
            {describeDue(item.due, today)}
          </p>
          <p className="truncate text-xs text-muted-foreground">{detail(item)}</p>
        </div>
        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

export function DueList({ items, today }: { items: VehicleStatusItem[]; today: ISODate }) {
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {items.map((item) => (
        <DueRow key={item.id} item={item} today={today} />
      ))}
    </ul>
  );
}
