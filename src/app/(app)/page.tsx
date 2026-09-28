import { PartyPopperIcon } from "lucide-react";
import { DocumentRow } from "@/components/document-list";
import { type DueItem, DueRow, DueTile } from "@/components/due-list";
import { EnableNotificationsCard } from "@/components/enable-notifications-card";
import { HeroCard } from "@/components/home/hero-card";
import { NextUp } from "@/components/home/next-up";
import { InstallGuide } from "@/components/install-guide";
import { SectionHeader } from "@/components/section-header";
import { diffDays, todayInJakarta } from "@/lib/dates";
import { STALE_READING_DAYS, dueProgress } from "@/lib/due";
import { orNotFound, requireCurrentVehicle } from "@/server/access";
import { listDocuments } from "@/server/queries/documents";
import { getVehicleStatus, listVehicles } from "@/server/queries/vehicles";

function greeting(now = new Date()) {
  const hour = (now.getUTCHours() + 7) % 24; // WIB
  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 19) return "Good evening";
  return "Good night";
}

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { user, householdId, vehicleId } = await requireCurrentVehicle((await searchParams).vehicle);
  const today = todayInJakarta();
  const [status, vehicles, documents] = await Promise.all([
    getVehicleStatus(householdId, vehicleId, today),
    listVehicles(householdId),
    listDocuments(householdId, today, vehicleId),
  ]);
  const { vehicle, items, currentKm, lastReadingDate, avgDailyKm } = orNotFound(status);

  const withProgress: DueItem[] = items.map((i) => ({ ...i, progress: dueProgress(i, { today, currentKm }) }));
  const attention = withProgress.filter((i) => i.due.status !== "ok");
  const upcoming = withProgress
    .filter((i) => i.due.status === "ok" && (i.intervalKm || i.intervalMonths))
    .sort((a, b) => b.progress - a.progress);
  const renewals = documents.filter((d) => d.renewal.status !== "ok");
  const next = attention[0] ?? upcoming[0];
  const restAttention = attention.filter((i) => i !== next);
  const restUpcoming = upcoming.filter((i) => i !== next);
  const daysSinceReading = lastReadingDate ? diffDays(lastReadingDate, today) : null;
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="grid gap-7 pt-4">
      <header className="rise-in flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" }).format(new Date())}
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {greeting()}
            {firstName && `, ${firstName}`}
          </p>
        </div>
      </header>

      <HeroCard
        vehicle={vehicle}
        vehicles={vehicles.map(({ id, name }) => ({ id, name }))}
        currentKm={currentKm}
        daysSinceReading={daysSinceReading}
        avgDailyKm={avgDailyKm}
        stale={daysSinceReading !== null && daysSinceReading > STALE_READING_DAYS}
        counts={{
          overdue: attention.filter((i) => i.due.status === "overdue").length,
          dueSoon: attention.filter((i) => i.due.status === "due_soon").length,
          ok: withProgress.length - attention.length,
        }}
      />

      <InstallGuide />
      <EnableNotificationsCard />

      {next && <NextUp item={next} today={today} />}

      {(renewals.length > 0 || restAttention.length > 0) && (
        <section className="grid gap-3" aria-labelledby="attention-heading">
          <SectionHeader id="attention-heading" title="Needs attention" count={renewals.length + restAttention.length} />
          <ul className="grid gap-3">
            {renewals.map((d, i) => (
              <DocumentRow key={d.id} doc={d} index={i} />
            ))}
            {restAttention.map((item, i) => (
              <DueRow key={item.id} item={item} today={today} index={renewals.length + i} />
            ))}
          </ul>
        </section>
      )}

      {attention.length === 0 && renewals.length === 0 && (
        <div className="rise-in flex items-center gap-3 rounded-3xl bg-ok/10 p-4 text-sm font-medium text-ok">
          <PartyPopperIcon className="size-5 shrink-0" aria-hidden />
          Everything is on track. Nice work keeping up.
        </div>
      )}

      {restUpcoming.length > 0 && (
        <section className="grid gap-3" aria-labelledby="upcoming-heading">
          <SectionHeader id="upcoming-heading" title="Coming up" description="Tap any item to log it" />
          <ul className="grid grid-cols-2 gap-3">
            {restUpcoming.map((item, i) => (
              <DueTile key={item.id} item={item} today={today} index={i} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
