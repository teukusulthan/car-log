import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { dueDetail, type DueItem } from "@/components/due-list";
import { DueProgress } from "@/components/due-progress";
import { MaintenanceIcon } from "@/components/maintenance-icon";
import type { ISODate } from "@/lib/dates";
import { describeDue } from "@/lib/format";

/** Spotlight on the single most urgent service. */
export function NextUp({ item, today }: { item: DueItem; today: ISODate }) {
  const status = item.due.status;
  const eyebrow = status === "overdue" ? "Overdue — do this first" : status === "due_soon" ? "Coming up next" : "Next service";
  return (
    <section aria-label="Next service" className="rise-in rounded-[28px] bg-card p-5 shadow-soft" style={{ ["--i" as string]: 1 }}>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
      <div className="mt-3 flex items-center gap-3.5">
        <MaintenanceIcon name={item.name} tone={status} className="size-12 rounded-2xl" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold">{item.name}</h2>
          <p className="text-sm font-medium text-muted-foreground">{describeDue(item.due, today)}</p>
        </div>
      </div>
      <DueProgress value={item.progress} tone={status} className="mt-4 h-2" />
      <p className="mt-2 text-xs text-muted-foreground">{dueDetail(item)}</p>
      <Link
        href={`/log?item=${item.id}`}
        className="pressable mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground text-[15px] font-semibold text-background"
      >
        Log {item.name.toLowerCase()} <ArrowRightIcon className="size-4" aria-hidden />
      </Link>
    </section>
  );
}
