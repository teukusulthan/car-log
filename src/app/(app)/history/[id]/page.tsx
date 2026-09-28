import { GaugeIcon, MapPinIcon, PencilIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteServiceButton } from "@/components/delete-service-button";
import { MaintenanceIcon } from "@/components/maintenance-icon";
import { PageHeader } from "@/components/page-header";
import { PhotoGrid } from "@/components/photo-grid";
import { SectionHeader } from "@/components/section-header";
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
    <div className="grid gap-6">
      <PageHeader
        title={formatDate(record.date)}
        subtitle={record.vehicleName}
        back="/history"
        action={
          <Link
            href={`/history/${record.id}/edit`}
            className="pressable flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold shadow-soft ring-1 ring-border"
          >
            <PencilIcon className="size-4" aria-hidden /> Edit
          </Link>
        }
      />

      <section className="rise-in rounded-[28px] bg-card p-5 shadow-soft">
        <p className="text-sm text-muted-foreground">Total paid</p>
        <p className="text-[34px] leading-tight font-semibold tracking-tight tabular-nums">{formatIDR(record.totalCost)}</p>
        <dl className="mt-4 grid gap-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <GaugeIcon className="size-4 text-muted-foreground" aria-hidden />
            <dt className="sr-only">Odometer</dt>
            <dd className="font-medium tabular-nums">{formatKm(record.odometer)}</dd>
          </div>
          {record.workshop && (
            <div className="flex items-center gap-2.5">
              <MapPinIcon className="size-4 text-muted-foreground" aria-hidden />
              <dt className="sr-only">Workshop</dt>
              <dd className="font-medium">{record.workshop}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="grid gap-3">
        <SectionHeader title="Work done" count={record.items.length} />
        <ul className="rise-in divide-y divide-border/70 overflow-hidden rounded-[24px] bg-card shadow-soft" style={{ ["--i" as string]: 1 }}>
          {record.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3">
              <MaintenanceIcon name={item.label} tone="primary" className="size-9 rounded-xl" />
              <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{item.cost !== null ? formatIDR(item.cost) : "—"}</span>
            </li>
          ))}
          {other > 0 && itemized > 0 && (
            <li className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-muted-foreground">
              <span>Other / labour</span>
              <span className="tabular-nums">{formatIDR(other)}</span>
            </li>
          )}
        </ul>
      </section>

      {record.attachments.length > 0 && (
        <section className="grid gap-3">
          <SectionHeader title="Receipts" count={record.attachments.length} />
          <PhotoGrid photos={record.attachments} />
        </section>
      )}

      {record.notes && (
        <section className="grid gap-3">
          <SectionHeader title="Notes" />
          <p className="rounded-[24px] bg-card p-4 whitespace-pre-wrap shadow-soft">{record.notes}</p>
        </section>
      )}

      {record.createdBy && <p className="text-center text-sm text-muted-foreground">Logged by {record.createdBy}</p>}

      <DeleteServiceButton recordId={record.id} />
    </div>
  );
}
