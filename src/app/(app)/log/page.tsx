import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "@/components/service-form";
import { todayInJakarta } from "@/lib/dates";
import { orNotFound, requireCurrentVehicle } from "@/server/access";
import { listWorkshops } from "@/server/queries/services";
import { getVehicleStatus } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Log service" };

export default async function LogServicePage({ searchParams }: PageProps<"/log">) {
  const { householdId, vehicleId } = await requireCurrentVehicle();
  const today = todayInJakarta();
  const [status, workshops, params] = await Promise.all([
    getVehicleStatus(householdId, vehicleId, today),
    listWorkshops(householdId),
    searchParams,
  ]);
  const { vehicle, items, currentKm } = orNotFound(status);

  return (
    <>
      <PageHeader title="Log service" subtitle={vehicle.name} back="/" />
      <ServiceForm
        recordId={null}
        vehicleId={vehicle.id}
        items={items.map((i) => ({ id: i.id, name: i.name, status: i.due.status }))}
        workshops={workshops}
        defaults={{ date: today, odometer: currentKm }}
        today={today}
        preselect={typeof params.item === "string" ? params.item : null}
        doneHref="/"
      />
    </>
  );
}
