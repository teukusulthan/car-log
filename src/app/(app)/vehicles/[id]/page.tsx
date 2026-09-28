import type { Metadata } from "next";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/page-header";
import { ReadingList } from "@/components/reading-list";
import { ScheduleEditor } from "@/components/schedule-editor";
import { VehicleForm } from "@/components/vehicle-form";
import { todayInJakarta } from "@/lib/dates";
import { deleteVehicleAction, updateVehicleAction } from "@/server/actions/vehicles";
import { orNotFound, requireMembership } from "@/server/access";
import { getVehicleStatus, listReadings } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Car settings" };

export default async function VehiclePage({ params }: PageProps<"/vehicles/[id]">) {
  const { id } = await params;
  const { householdId } = await requireMembership();
  const today = todayInJakarta();
  const status = orNotFound(await getVehicleStatus(householdId, id, today));
  const readings = (await listReadings(householdId, id)).slice(0, 10);
  const { vehicle } = status;
  const schedule = [...status.items].sort((a, b) => a.sort - b.sort);

  return (
    <>
      <PageHeader
        title={vehicle.name}
        subtitle={`${vehicle.make} ${vehicle.model}` !== vehicle.name ? `${vehicle.make} ${vehicle.model}` : undefined}
        back="/settings"
      />
      <section className="grid gap-3">
        <VehicleForm
          mode="edit"
          action={updateVehicleAction.bind(null, vehicle.id)}
          defaults={vehicle}
          today={today}
        />
      </section>
      <section className="mt-10 grid gap-3">
        <div>
          <h2 className="px-1 text-lg font-semibold">Service schedule</h2>
          <p className="px-1 text-sm text-muted-foreground">
            Whichever comes first triggers a reminder. Check your owner&apos;s manual for exact intervals.
          </p>
        </div>
        <ScheduleEditor
          vehicleId={vehicle.id}
          items={schedule.map(({ id, name, intervalKm, intervalMonths }) => ({ id, name, intervalKm, intervalMonths }))}
        />
      </section>
      <section className="mt-10 grid gap-3">
        <div>
          <h2 className="px-1 text-lg font-semibold">Odometer readings</h2>
          <p className="px-1 text-sm text-muted-foreground">Entered a wrong number? Delete it here.</p>
        </div>
        <ReadingList readings={readings} />
      </section>
      <section className="mt-10 mb-4 grid gap-3">
        <h2 className="px-1 text-lg font-semibold">Danger zone</h2>
        <ConfirmDeleteButton
          label="Delete this car"
          title={`Delete ${vehicle.name}?`}
          description="This permanently removes the car with all its service history, documents and photos."
          onConfirm={deleteVehicleAction.bind(null, vehicle.id)}
        />
      </section>
    </>
  );
}
