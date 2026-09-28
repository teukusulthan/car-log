import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "@/components/service-form";
import { todayInJakarta } from "@/lib/dates";
import { orNotFound, requireMembership } from "@/server/access";
import { getService, listWorkshops } from "@/server/queries/services";
import { getVehicleStatus } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: PageProps<"/history/[id]/edit">) {
  const { id } = await params;
  const { householdId } = await requireMembership();
  const today = todayInJakarta();
  const record = orNotFound(await getService(householdId, id));
  const [status, workshops] = await Promise.all([
    getVehicleStatus(householdId, record.vehicleId, today),
    listWorkshops(householdId),
  ]);
  const { items } = orNotFound(status);

  return (
    <>
      <PageHeader title="Edit service" subtitle={record.vehicleName} back={`/history/${id}`} />
      <ServiceForm
        recordId={record.id}
        vehicleId={record.vehicleId}
        items={items.map((i) => ({ id: i.id, name: i.name, status: "ok" as const }))}
        workshops={workshops}
        defaults={{
          date: record.date,
          odometer: record.odometer,
          workshop: record.workshop,
          notes: record.notes,
          totalCost: record.totalCost,
          lines: record.items,
          photos: record.attachments,
        }}
        today={today}
        doneHref={`/history/${id}`}
      />
    </>
  );
}
