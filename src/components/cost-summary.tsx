import Link from "next/link";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OTHER_LABEL, type CostSummary as Summary } from "@/server/queries/services";

const MONTH_INITIALS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function CostSummary({ summary, years, currentMonth }: { summary: Summary; years: number[]; currentMonth: number | null }) {
  const peak = Math.max(...summary.byMonth, 1);
  // A breakdown that is only "Other / labour" says nothing — show it once something is itemised.
  const top = summary.byItem.some((i) => i.label !== OTHER_LABEL) ? summary.byItem.slice(0, 4) : [];
  return (
    <section className="grid gap-4 rounded-2xl border bg-card p-4" aria-label={`Spending in ${summary.year}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Spent in {summary.year}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatIDR(summary.total)}</p>
          <p className="text-sm text-muted-foreground">
            {summary.serviceCount} service{summary.serviceCount === 1 ? "" : "s"}
          </p>
        </div>
        {years.length > 1 && (
          <nav aria-label="Year" className="flex flex-wrap justify-end gap-1">
            {years.map((y) => (
              <Link
                key={y}
                href={`/history?year=${y}`}
                aria-current={y === summary.year ? "true" : undefined}
                className={cn(
                  "rounded-full px-2.5 py-1 text-sm font-medium",
                  y === summary.year ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {y}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div className="grid grid-cols-12 items-end gap-1" role="img" aria-label="Spending per month">
        {summary.byMonth.map((amount, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="flex h-16 w-full items-end">
              <div
                title={formatIDR(amount)}
                className={cn("w-full rounded-t-sm", amount ? "bg-primary" : "bg-muted", i === currentMonth && "ring-2 ring-primary/30")}
                style={{ height: amount ? `${Math.max(8, (amount / peak) * 100)}%` : "3px" }}
              />
            </div>
            <span className={cn("text-[10px] text-muted-foreground", i === currentMonth && "font-semibold text-foreground")}>
              {MONTH_INITIALS[i]}
            </span>
          </div>
        ))}
      </div>

      {top.length > 0 && (
        <ul className="grid gap-1.5 text-sm">
          {top.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3">
              <span className="truncate text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">{formatIDR(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
