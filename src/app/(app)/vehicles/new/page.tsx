import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { VehicleForm } from "@/components/vehicle-form";
import { todayInJakarta } from "@/lib/dates";
import { createVehicleAction } from "@/server/actions/vehicles";

export const metadata: Metadata = { title: "Add car" };

export default async function NewVehiclePage({ searchParams }: PageProps<"/vehicles/new">) {
  const first = (await searchParams).first === "1";
  return (
    <>
      <PageHeader
        title={first ? "Add your car" : "Add a car"}
        back={first ? undefined : "/settings"}
        subtitle={first ? "We'll set up a standard service schedule you can adjust later." : undefined}
      />
      <VehicleForm mode="create" action={createVehicleAction} today={todayInJakarta()} />
    </>
  );
}
