import { FileTextIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DocumentRow } from "@/components/document-list";
import { PageHeader } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
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
    <Button asChild size="sm" className="h-11 rounded-full px-4 shadow-soft">
      <Link href="/documents/new">
        <PlusIcon /> Add
      </Link>
    </Button>
  );

  return (
    <div className="grid gap-6">
      <PageHeader title="Documents" subtitle="Insurance, STNK and other renewals" action={vehicles.length ? addButton : undefined} />
      {docs.length === 0 ? (
        <div className="rise-in grid justify-items-center gap-4 rounded-[28px] bg-card px-6 py-10 text-center shadow-soft">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileTextIcon className="size-6" aria-hidden />
          </span>
          <div className="grid gap-1">
            <p className="text-lg font-semibold">No documents yet</p>
            <p className="text-sm text-muted-foreground">Add your insurance and STNK tax so you&apos;re reminded before they expire.</p>
          </div>
          {vehicles.length > 0 && (
            <Button asChild size="lg" className="rounded-2xl">
              <Link href="/documents/new">Add a document</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {attention.length > 0 && (
            <section className="grid gap-2">
              <SectionHeader title="Needs renewal" count={attention.length} />
              <ul className="grid gap-3">
                {attention.map((d, i) => (
                  <DocumentRow key={d.id} doc={d} index={i} showVehicle={vehicles.length > 1} />
                ))}
              </ul>
            </section>
          )}
          {rest.length > 0 && (
            <section className="grid gap-2">
              <SectionHeader title="Valid" />
              <ul className="grid gap-3">
                {rest.map((d, i) => (
                  <DocumentRow key={d.id} doc={d} index={attention.length + i} showVehicle={vehicles.length > 1} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
