"use client";

import Link from "next/link";
import { useState } from "react";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Summary = {
  year: number;
  total: number;
  serviceCount: number;
  byMonth: number[];
  byItem: { label: string; total: number }[];
};

/** Year spend with a tappable month chart and a per-item breakdown. */
export function CostSummary({
  summary,
  years,
  currentMonth,
  otherLabel,
}: {
  summary: Summary;
  years: number[];
  currentMonth: number | null;
  otherLabel: string;
}) {
  const lastWithSpend = summary.byMonth.findLastIndex((m) => m > 0);
  const [selected, setSelected] = useState<number | null>(null);
  const focus = selected ?? (currentMonth !== null && summary.byMonth[currentMonth] ? currentMonth : lastWithSpend >= 0 ? lastWithSpend : null);
  const peak = Math.max(...summary.byMonth, 1);
  const itemized = summary.byItem.some((i) => i.label !== otherLabel);
  const top = itemized ? summary.byItem.slice(0, 5) : [];

  return (
    <section className="rise-in grid gap-5 rounded-[28px] bg-card p-5 shadow-soft" aria-label={`Spending in ${summary.year}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Spent in {summary.year}</p>
          <p className="text-[32px] leading-tight font-semibold tracking-tight tabular-nums">{formatIDR(summary.total)}</p>
          <p className="text-sm text-muted-foreground">
            {summary.serviceCount} service{summary.serviceCount === 1 ? "" : "s"}
            {summary.serviceCount > 0 && ` · avg ${formatIDR(Math.round(summary.total / summary.serviceCount))}`}
          </p>
        </div>
        {years.length > 1 && (
          <nav aria-label="Year" className="flex shrink-0 gap-1 rounded-full bg-muted p-1">
            {years.slice(0, 3).map((y) => (
              <Link
                key={y}
                href={`/history?year=${y}`}
                aria-current={y === summary.year ? "true" : undefined}
                className={cn(
                  "pressable rounded-full px-2.5 py-1 text-xs font-semibold",
                  y === summary.year ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                )}
              >
                {y}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div>
        <div className="grid grid-cols-12 items-end gap-1.5" role="group" aria-label="Spending per month — tap a month">
          {summary.byMonth.map((amount, i) => {
            const active = i === focus;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={active}
                aria-label={`${MONTHS[i]}: ${formatIDR(amount)}`}
                className="group flex flex-col items-center gap-1.5"
              >
                <span className="flex h-24 w-full items-end">
                  <span
                    className={cn(
                      "w-full origin-bottom rounded-md transition-colors duration-200",
                      amount ? (active ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/60") : "bg-muted",
                    )}
                    style={{
                      height: amount ? `${Math.max(8, (amount / peak) * 100)}%` : "4px",
                      animation: `grow-y 600ms var(--ease-out-soft) ${120 + i * 30}ms both`,
                    }}
                  />
                </span>
                <span className={cn("text-[10px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{MONTHS[i][0]}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex items-center justify-between rounded-2xl bg-muted/70 px-3.5 py-2.5 text-sm" aria-live="polite">
          <span className="text-muted-foreground">{focus !== null ? `${MONTHS[focus]} ${summary.year}` : "No spending yet"}</span>
          <span className="font-semibold tabular-nums">{focus !== null ? formatIDR(summary.byMonth[focus]) : ""}</span>
        </p>
      </div>

      {top.length > 0 && (
        <ul className="grid gap-3" aria-label="Where the money went">
          {top.map((item) => {
            const share = summary.total ? item.total / summary.total : 0;
            return (
              <li key={item.label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatIDR(item.total)} <span className="text-muted-foreground">· {Math.round(share * 100)}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="grow-x h-full rounded-full bg-primary/70" style={{ width: `${Math.max(2, share * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
