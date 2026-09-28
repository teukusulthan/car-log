"use client";

import { ChevronDownIcon, GaugeIcon } from "lucide-react";
import { useState } from "react";
import { OdometerForm } from "@/components/odometer-card";
import { Plate } from "@/components/plate";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VehicleSelect } from "@/components/vehicle-select";
import { describeAgo, formatKm, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  vehicle: { id: string; name: string; make: string; model: string; year: number | null; plate: string | null };
  vehicles: { id: string; name: string }[];
  currentKm: number;
  daysSinceReading: number | null;
  avgDailyKm: number | null;
  stale: boolean;
  counts: { overdue: number; dueSoon: number; ok: number };
};

/** The car at a glance: name, plate, odometer, health — and the one-tap mileage update. */
export function HeroCard({ vehicle, vehicles, currentKm, daysSinceReading, avgDailyKm, stale, counts }: Props) {
  const [open, setOpen] = useState(false);
  const subtitle = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" · ");
  const showSubtitle = subtitle.toLowerCase() !== vehicle.name.toLowerCase();

  return (
    <section
      aria-label={`${vehicle.name} overview`}
      className="rise-in relative isolate overflow-hidden rounded-[28px] bg-primary p-5 text-primary-foreground shadow-lift"
    >
      {/* Decorative light and a faint gauge arc. */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 -z-10 size-64 rounded-full bg-black/15 blur-3xl" />
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -bottom-16 -z-10 size-56 text-white/10">
        <path d="M30 150 A80 80 0 1 1 170 150" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
        <path d="M100 110 L150 60" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      </svg>

      <div className="flex items-start justify-between gap-3">
        <div className="relative min-w-0">
          <h1 className="flex items-center gap-1 text-[22px] leading-tight font-semibold">
            <span className="truncate">{vehicle.name}</span>
            {vehicles.length > 1 && <ChevronDownIcon className="size-5 shrink-0 opacity-70" aria-hidden />}
          </h1>
          {showSubtitle && <p className="truncate text-sm text-primary-foreground/70">{subtitle}</p>}
          {vehicles.length > 1 && <VehicleSelect vehicles={vehicles} currentId={vehicle.id} />}
        </div>
        {vehicle.plate && <Plate value={vehicle.plate} className="mt-1 shrink-0" />}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-primary-foreground/70 uppercase">Odometer</p>
          <p className="text-[40px] leading-none font-semibold tracking-tight tabular-nums">
            {formatNumber(currentKm)}
            <span className="ml-1.5 text-lg font-medium text-primary-foreground/70">km</span>
          </p>
          <p className="mt-2 text-sm text-primary-foreground/75">
            {daysSinceReading !== null && `Updated ${describeAgo(daysSinceReading)}`}
            {avgDailyKm !== null && ` · ~${formatNumber(avgDailyKm)} km/day`}
          </p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "pressable flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold backdrop-blur-md",
                stale ? "bg-white text-primary shadow-soft" : "bg-white/15 text-primary-foreground ring-1 ring-white/25 ring-inset",
              )}
            >
              <GaugeIcon className="size-4" aria-hidden /> Update
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[28px] pb-safe">
            <SheetHeader>
              <SheetTitle>Update odometer</SheetTitle>
              <SheetDescription>Enter the number on your dashboard. Last reading: {formatKm(currentKm)}.</SheetDescription>
            </SheetHeader>
            {open && <OdometerForm vehicleId={vehicle.id} currentKm={currentKm} onDone={() => setOpen(false)} />}
          </SheetContent>
        </Sheet>
      </div>

      {stale && (
        <p className="mt-4 rounded-2xl bg-white/12 px-3.5 py-2.5 text-sm ring-1 ring-white/15 ring-inset">
          Your last reading is {describeAgo(daysSinceReading ?? 0)}. Update it so km reminders stay accurate.
        </p>
      )}

      <ul className="mt-5 grid grid-cols-3 gap-2 text-center" aria-label="Maintenance health">
        <HealthStat label="Overdue" value={counts.overdue} dot="bg-overdue" />
        <HealthStat label="Due soon" value={counts.dueSoon} dot="bg-due-soon" />
        <HealthStat label="On track" value={counts.ok} dot="bg-ok" />
      </ul>
    </section>
  );
}

function HealthStat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <li className="rounded-2xl bg-white/10 px-2 py-2.5 ring-1 ring-white/10 ring-inset">
      <p className="text-xl leading-none font-semibold tabular-nums">{value}</p>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] font-medium text-primary-foreground/80">
        <span aria-hidden className={cn("size-1.5 rounded-full", value ? dot : "bg-white/40")} />
        {label}
      </p>
    </li>
  );
}
