import { CameraIcon, ChevronRightIcon, WrenchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CostSummary } from "@/components/cost-summary";
import { Button } from "@/components/ui/button";
import { VehicleHeader } from "@/components/vehicle-header";
import { todayInJakarta } from "@/lib/dates";
import { formatIDR, formatKm, formatMonth, formatShortDate } from "@/lib/format";
import { orNotFound, requireCurrentVehicle } from "@/server/access";
import { costSummary, listServiceYears, listServices, type ServiceListItem } from "@/server/queries/services";
import { getVehicle, listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "History" };

function groupByMonth(records: ServiceListItem[]) {
  const groups = new Map<string, ServiceListItem[]>();
  for (const r of records) {
    const key = r.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()];
}

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const { householdId, vehicleId } = await requireCurrentVehicle();
  const today = todayInJakarta();
  const thisYear = Number(today.slice(0, 4));
  const requested = Number((await searchParams).year);
  const year = Number.isInteger(requested) && requested > 1900 && requested < 3000 ? requested : thisYear;

  const [vehicle, vehicles, records, years, summary] = await Promise.all([
    getVehicle(householdId, vehicleId),
    listVehicles(householdId),
    listServices(householdId, vehicleId),
    listServiceYears(householdId, vehicleId),
    costSummary(householdId, vehicleId, year),
  ]);
  const current = orNotFound(vehicle);
  const yearOptions = [...new Set([thisYear, ...years])].sort((a, b) => b - a);

  return (
    <div className="grid gap-6">
      <VehicleHeader eyebrow="Service history" vehicles={vehicles} current={current} />
      <CostSummary summary={summary} years={yearOptions} currentMonth={year === thisYear ? Number(today.slice(5, 7)) - 1 : null} />

      {records.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <WrenchIcon className="size-8 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">No services logged yet</p>
            <p className="text-sm text-muted-foreground">Log past visits too — it makes reminders accurate.</p>
          </div>
          <Button asChild>
            <Link href="/log">Log a service</Link>
          </Button>
        </div>
      ) : (
        groupByMonth(records).map(([month, items]) => (
          <section key={month} className="grid gap-2" aria-label={formatMonth(`${month}-01`)}>
            <h2 className="text-sm font-semibold text-muted-foreground">{formatMonth(`${month}-01`)}</h2>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {items.map((r) => (
                <li key={r.id}>
                  <Link href={`/history/${r.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-muted">
                    <div className="w-11 shrink-0 text-center">
                      <p className="text-lg leading-none font-semibold">{r.date.slice(8, 10).replace(/^0/, "")}</p>
                      <p className="text-xs text-muted-foreground">{formatShortDate(r.date).split(" ")[1]}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.labels.join(", ") || "Service"}</p>
                      <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                        {formatKm(r.odometer)}
                        {r.workshop && <> · {r.workshop}</>}
                        {r.photoCount > 0 && <CameraIcon className="size-3.5 shrink-0" aria-label={`${r.photoCount} photos`} />}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">{formatIDR(r.totalCost)}</p>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
