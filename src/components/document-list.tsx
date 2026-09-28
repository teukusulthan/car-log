import { ChevronRightIcon, FileTextIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import type { DocumentListItem } from "@/server/queries/documents";

export function describeRenewal({ status, daysLeft }: DocumentListItem["renewal"]) {
  if (status === "expired") return daysLeft === -1 ? "Expired yesterday" : `Expired ${-daysLeft} days ago`;
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Expires tomorrow";
  if (daysLeft < 60) return `Expires in ${daysLeft} days`;
  return `Valid for ${Math.round(daysLeft / 30)} more months`;
}

export function DocumentRow({ doc, showVehicle }: { doc: DocumentListItem; showVehicle?: boolean }) {
  const Icon = doc.type === "insurance" ? ShieldCheckIcon : FileTextIcon;
  return (
    <li>
      <Link href={`/documents/${doc.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-muted">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{doc.title}</p>
            {doc.renewal.status !== "ok" && <StatusBadge tone={doc.renewal.status} />}
          </div>
          <p className={doc.renewal.status === "ok" ? "text-sm text-muted-foreground" : "text-sm font-medium"}>
            {describeRenewal(doc.renewal)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDate(doc.expiresOn)}
            {showVehicle && ` · ${doc.vehicleName}`}
          </p>
        </div>
        <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
