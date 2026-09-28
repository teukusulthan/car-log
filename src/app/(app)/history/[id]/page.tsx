import { PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteServiceButton } from "@/components/delete-service-button";
import { PageHeader } from "@/components/page-header";
import { PhotoGrid } from "@/components/photo-grid";
import { Button } from "@/components/ui/button";
import { formatDate, formatIDR, formatKm } from "@/lib/format";
import { orNotFound, requireMembership } from "@/server/access";
import { getService } from "@/server/queries/services";

export const metadata: Metadata = { title: "Service" };

export default async function ServiceDetailPage({ params }: PageProps<"/history/[id]">) {
  const { id } = await params;
  const { householdId } = await requireMembership();
  const record = orNotFound(await getService(householdId, id));
  const itemized = record.items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
  const other = record.totalCost - itemized;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={formatDate(record.date)}
        subtitle={record.vehicleName}
        back="/history"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/history/${record.id}/edit`}>
              <PencilIcon /> Edit
            </Link>
          </Button>
        }
      />

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Odometer</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatKm(record.odometer)}</dd>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Total paid</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatIDR(record.totalCost)}</dd>
        </div>
        {record.workshop && (
          <div className="col-span-2 rounded-2xl border bg-card p-4">
            <dt className="text-sm text-muted-foreground">Workshop</dt>
            <dd className="font-medium">{record.workshop}</dd>
          </div>
        )}
      </dl>

      <section className="grid gap-2">
        <h2 className="font-semibold">Work done</h2>
        <ul className="divide-y rounded-2xl border bg-card">
          {record.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span>{item.label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{item.cost !== null ? formatIDR(item.cost) : "—"}</span>
            </li>
          ))}
          {other > 0 && itemized > 0 && (
            <li className="flex items-center justify-between gap-3 px-4 py-3 text-muted-foreground">
              <span>Other / labour</span>
              <span className="text-sm tabular-nums">{formatIDR(other)}</span>
            </li>
          )}
        </ul>
      </section>

      {record.attachments.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Receipts</h2>
          <PhotoGrid photos={record.attachments} />
        </section>
      )}

      {record.notes && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Notes</h2>
          <p className="rounded-2xl border bg-card p-4 whitespace-pre-wrap">{record.notes}</p>
        </section>
      )}

      {record.createdBy && <p className="text-center text-sm text-muted-foreground">Logged by {record.createdBy}</p>}

      <DeleteServiceButton recordId={record.id} />
    </div>
  );
}
