import { PartyPopperIcon } from "lucide-react";
import { DueList } from "@/components/due-list";
import { OdometerCard } from "@/components/odometer-card";
import { VehicleHeader } from "@/components/vehicle-header";
import { diffDays, todayInJakarta } from "@/lib/dates";
import { STALE_READING_DAYS } from "@/lib/due";
import { orNotFound, requireCurrentVehicle } from "@/server/access";
import { getVehicleStatus, listVehicles } from "@/server/queries/vehicles";

export default async function HomePage() {
  const { householdId, vehicleId } = await requireCurrentVehicle();
  const today = todayInJakarta();
  const [status, vehicles] = await Promise.all([getVehicleStatus(householdId, vehicleId, today), listVehicles(householdId)]);
  const { vehicle, items, currentKm, lastReadingDate, avgDailyKm } = orNotFound(status);

  const daysSinceReading = lastReadingDate ? diffDays(lastReadingDate, today) : null;
  const attention = items.filter((i) => i.due.status !== "ok");
  const upcoming = items.filter((i) => i.due.status === "ok");

  return (
    <div className="grid gap-6">
      <VehicleHeader eyebrow="Your car" vehicles={vehicles} current={vehicle} />

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
        {attention.length ? (
          <DueList items={attention} today={today} />
        ) : (
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
