import { CameraIcon, ChevronRightIcon, WrenchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CarSwitchTitle } from "@/components/car-switch-title";
import { CostSummary } from "@/components/cost-summary";
import { MaintenanceIcon } from "@/components/maintenance-icon";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { todayInJakarta } from "@/lib/dates";
import { formatIDR, formatKm, formatMonth } from "@/lib/format";
import { orNotFound, requireCurrentVehicle } from "@/server/access";
import { OTHER_LABEL, costSummary, listServiceYears, listServices, type ServiceListItem } from "@/server/queries/services";
import { getVehicle, listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "History" };

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

function groupByMonth(records: ServiceListItem[]) {
  const groups = new Map<string, ServiceListItem[]>();
  for (const r of records) {
    const key = r.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()];
}

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const params = await searchParams;
  const { householdId, vehicleId } = await requireCurrentVehicle(params.vehicle);
  const today = todayInJakarta();
  const thisYear = Number(today.slice(0, 4));
  const requested = Number(params.year);
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
  let index = 0;

  return (
    <div className="grid gap-7">
      <PageHeader
        title="History"
        subtitle={<CarSwitchTitle vehicles={vehicles.map(({ id, name }) => ({ id, name }))} currentId={current.id} />}
      />

      <CostSummary
        summary={summary}
        years={yearOptions}
        currentMonth={year === thisYear ? Number(today.slice(5, 7)) - 1 : null}
        otherLabel={OTHER_LABEL}
      />

      {records.length === 0 ? (
        <div className="rise-in grid justify-items-center gap-4 rounded-[28px] bg-card px-6 py-10 text-center shadow-soft">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <WrenchIcon className="size-6" aria-hidden />
          </span>
          <div className="grid gap-1">
            <p className="text-lg font-semibold">No services logged yet</p>
            <p className="text-sm text-muted-foreground">Add past visits too — it makes every reminder more accurate.</p>
          </div>
          <Button asChild size="lg" className="rounded-2xl">
            <Link href="/log">Log a service</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          <SectionHeader title="Timeline" description={`${records.length} visit${records.length === 1 ? "" : "s"} logged`} />
          {groupByMonth(records).map(([month, items]) => (
            <section key={month} aria-label={formatMonth(`${month}-01`)} className="grid gap-3">
              <h3 className="px-1 text-sm font-semibold text-muted-foreground">{formatMonth(`${month}-01`)}</h3>
              <ol className="relative grid gap-3 before:absolute before:top-4 before:bottom-4 before:left-[27px] before:w-px before:bg-border">
                {items.map((r) => {
                  const d = new Date(`${r.date}T00:00:00Z`);
                  return (
                    <li key={r.id} className="rise-in relative" style={{ ["--i" as string]: index++ }}>
                      <Link href={`/history/${r.id}`} className="pressable flex items-start gap-3.5 rounded-3xl bg-card p-3.5 shadow-soft active:bg-muted/60">
                        <div className="relative z-10 flex w-[30px] shrink-0 flex-col items-center pt-0.5">
                          <span className="text-lg leading-none font-semibold tabular-nums">{d.getUTCDate()}</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">{WEEKDAY.format(d)}</span>
                        </div>
                        <div className="grid min-w-0 flex-1 gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 font-semibold">{r.labels.join(", ") || "Service"}</p>
                            <p className="shrink-0 font-semibold tabular-nums">{formatIDR(r.totalCost)}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.labels.slice(0, 4).map((label) => (
                              <MaintenanceIcon key={label} name={label} className="size-7 rounded-lg [&_svg]:size-3.5" />
                            ))}
                            <span className="ml-1 truncate text-xs text-muted-foreground">
                              {formatKm(r.odometer)}
                              {r.workshop && ` · ${r.workshop}`}
                            </span>
                            {r.photoCount > 0 && <CameraIcon className="size-3.5 text-muted-foreground" aria-label={`${r.photoCount} photos`} />}
                          </div>
                        </div>
                        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
