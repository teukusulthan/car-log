import type { Metadata } from "next";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { describeRenewal } from "@/components/document-list";
import { DocumentForm } from "@/components/document-form";
import { PageHeader } from "@/components/page-header";
import { RenewDocumentButton } from "@/components/renew-document-button";
import { CountdownRing } from "@/components/countdown-ring";
import { StatusBadge } from "@/components/status-badge";
import { addMonths, todayInJakarta } from "@/lib/dates";
import { renewalStatus } from "@/lib/documents";
import { DOCUMENT_PRESETS } from "@/lib/document-types";
import { formatDate } from "@/lib/format";
import { orNotFound, requireMembership } from "@/server/access";
import { getDocument } from "@/server/queries/documents";
import { listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params }: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const { householdId } = await requireMembership();
  const [doc, vehicles] = await Promise.all([getDocument(householdId, id), listVehicles(householdId)]);
  const d = orNotFound(doc);
  const renewal = renewalStatus(d.expiresOn, d.remindDaysBefore, todayInJakarta());
  const suggested = addMonths(d.expiresOn, DOCUMENT_PRESETS[d.type].renewMonths);

  return (
    <div className="grid gap-6">
      <PageHeader title={d.title} subtitle={d.vehicleName} back="/documents" />
      <section className="rise-in grid gap-5 rounded-[28px] bg-card p-5 shadow-soft">
        <div className="flex items-center gap-5">
          <CountdownRing daysLeft={renewal.daysLeft} periodDays={DOCUMENT_PRESETS[d.type].renewMonths * 30} tone={renewal.status} />
          <div className="grid gap-1">
            <StatusBadge tone={renewal.status} className="justify-self-start" />
            <p className="text-sm text-muted-foreground">Expires</p>
            <p className="text-xl font-semibold">{formatDate(d.expiresOn)}</p>
            <p className="text-sm text-muted-foreground">{describeRenewal(renewal)}</p>
          </div>
        </div>
        <RenewDocumentButton documentId={d.id} suggested={suggested} />
      </section>
      <section className="grid gap-3">
        <h2 className="px-1 text-lg font-semibold">Details</h2>
        {/* Keyed on the saved values so a renewal (or another member's edit) refreshes these uncontrolled fields. */}
        <DocumentForm
          key={`${d.expiresOn}|${d.title}|${d.remindDaysBefore}`}
          documentId={d.id}
          vehicles={vehicles.map(({ id: vid, name }) => ({ id: vid, name }))}
          defaults={{ ...d, photos: d.attachments }}
        />
      </section>
      <DeleteDocumentButton documentId={d.id} />
    </div>
  );
}
