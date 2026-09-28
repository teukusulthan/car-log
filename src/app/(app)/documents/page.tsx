import { FileTextIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentRow } from "@/components/document-list";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { todayInJakarta } from "@/lib/dates";
import { requireMembership } from "@/server/access";
import { listDocuments } from "@/server/queries/documents";
import { listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { householdId } = await requireMembership();
  const [docs, vehicles] = await Promise.all([listDocuments(householdId, todayInJakarta()), listVehicles(householdId)]);
  const attention = docs.filter((d) => d.renewal.status !== "ok");
  const rest = docs.filter((d) => d.renewal.status === "ok");
  const addButton = (
    <Button asChild size="sm">
      <Link href="/documents/new">
        <PlusIcon /> Add
      </Link>
    </Button>
  );

  return (
    <div className="grid gap-6">
      <PageHeader title="Documents" subtitle="Insurance, STNK and other renewals" action={vehicles.length ? addButton : undefined} />
      {docs.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <FileTextIcon className="size-8 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">No documents yet</p>
            <p className="text-sm text-muted-foreground">Add your insurance and STNK so you&apos;re reminded before they expire.</p>
          </div>
          {vehicles.length > 0 && (
            <Button asChild>
              <Link href="/documents/new">Add a document</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {attention.length > 0 && (
            <section className="grid gap-2">
              <h2 className="text-lg font-semibold">Needs renewal</h2>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {attention.map((d) => (
                  <DocumentRow key={d.id} doc={d} showVehicle={vehicles.length > 1} />
                ))}
              </ul>
            </section>
          )}
          {rest.length > 0 && (
            <section className="grid gap-2">
              <h2 className="text-lg font-semibold">Valid</h2>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {rest.map((d) => (
                  <DocumentRow key={d.id} doc={d} showVehicle={vehicles.length > 1} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
