import type { Metadata } from "next";
import { DocumentForm } from "@/components/document-form";
import { PageHeader } from "@/components/page-header";
import { addMonths, todayInJakarta } from "@/lib/dates";
import { DOCUMENT_PRESETS } from "@/lib/document-types";
import { requireCurrentVehicle } from "@/server/access";
import { listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Add document" };

export default async function NewDocumentPage() {
  const { householdId, vehicleId } = await requireCurrentVehicle();
  const vehicles = await listVehicles(householdId);
  const preset = DOCUMENT_PRESETS.insurance;
  return (
    <>
      <PageHeader title="Add document" back="/documents" />
      <DocumentForm
        documentId={null}
        vehicles={vehicles.map(({ id, name }) => ({ id, name }))}
        defaults={{
          vehicleId,
          type: "insurance",
          title: preset.title,
          expiresOn: addMonths(todayInJakarta(), 12),
          remindDaysBefore: preset.remindDaysBefore,
          notes: null,
        }}
      />
    </>
  );
}
