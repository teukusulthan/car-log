import { PartyPopperIcon } from "lucide-react";
import { DocumentRow } from "@/components/document-list";
import { DueList } from "@/components/due-list";
import { EnableNotificationsCard } from "@/components/enable-notifications-card";
import { InstallGuide } from "@/components/install-guide";
import { OdometerCard } from "@/components/odometer-card";
import { VehicleHeader } from "@/components/vehicle-header";
import { diffDays, todayInJakarta } from "@/lib/dates";
import { STALE_READING_DAYS } from "@/lib/due";
import { orNotFound, requireCurrentVehicle } from "@/server/access";
import { listDocuments } from "@/server/queries/documents";
import { getVehicleStatus, listVehicles } from "@/server/queries/vehicles";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { householdId, vehicleId } = await requireCurrentVehicle((await searchParams).vehicle);
  const today = todayInJakarta();
  const [status, vehicles, documents] = await Promise.all([
    getVehicleStatus(householdId, vehicleId, today),
    listVehicles(householdId),
    listDocuments(householdId, today, vehicleId),
  ]);
  const { vehicle, items, currentKm, lastReadingDate, avgDailyKm } = orNotFound(status);

  const daysSinceReading = lastReadingDate ? diffDays(lastReadingDate, today) : null;
  const attention = items.filter((i) => i.due.status !== "ok");
  const upcoming = items.filter((i) => i.due.status === "ok");
  const renewals = documents.filter((d) => d.renewal.status !== "ok");

  return (
    <div className="grid gap-6">
      <VehicleHeader eyebrow="Your car" vehicles={vehicles} current={vehicle} />
      <InstallGuide />
      <EnableNotificationsCard />

      <OdometerCard
        vehicleId={vehicle.id}
        currentKm={currentKm}
        daysSinceReading={daysSinceReading}
        avgDailyKm={avgDailyKm}
        stale={daysSinceReading !== null && daysSinceReading > STALE_READING_DAYS}
      />

      <section className="grid gap-3" aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-lg font-semibold">
          Needs attention
        </h2>
        {renewals.length > 0 && (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {renewals.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </ul>
        )}
        {attention.length > 0 && <DueList items={attention} today={today} />}
        {attention.length === 0 && renewals.length === 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            <PartyPopperIcon className="size-5 shrink-0 text-ok" aria-hidden />
            Nothing due right now. Nice!
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="grid gap-3" aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="text-lg font-semibold">
            Coming up
          </h2>
          <DueList items={upcoming} today={today} />
        </section>
      )}
    </div>
  );
}
