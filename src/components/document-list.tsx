import { ChevronRightIcon, FileTextIcon, LandmarkIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DocumentListItem } from "@/server/queries/documents";

export function describeRenewal({ status, daysLeft }: DocumentListItem["renewal"]) {
  if (status === "expired") return daysLeft === -1 ? "Expired yesterday" : `Expired ${-daysLeft} days ago`;
  if (daysLeft === 0) return "Expires today";
  if (daysLeft === 1) return "Expires tomorrow";
  if (daysLeft < 60) return `Expires in ${daysLeft} days`;
  return `Valid for ${Math.round(daysLeft / 30)} more months`;
}

export const DOCUMENT_ICONS = {
  insurance: ShieldCheckIcon,
  stnk_annual: LandmarkIcon,
  stnk_5yr: LandmarkIcon,
  other: FileTextIcon,
} as const;

export function DocumentRow({ doc, showVehicle, index = 0 }: { doc: DocumentListItem; showVehicle?: boolean; index?: number }) {
  const Icon = DOCUMENT_ICONS[doc.type];
  const { status, daysLeft } = doc.renewal;
  const tone =
    status === "expired" ? "bg-overdue/12 text-overdue" : status === "due_soon" ? "bg-due-soon/20 text-due-soon-foreground dark:text-due-soon" : "bg-muted text-muted-foreground";
  return (
    <li className="rise-in" style={{ ["--i" as string]: index }}>
      <Link href={`/documents/${doc.id}`} className="pressable flex items-center gap-3.5 rounded-3xl bg-card p-4 shadow-soft active:bg-muted/60">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", tone)} aria-hidden>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{doc.title}</p>
            {status !== "ok" && <StatusBadge tone={status} />}
          </div>
          <p className={status === "ok" ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{describeRenewal(doc.renewal)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatDate(doc.expiresOn)}
            {showVehicle && ` · ${doc.vehicleName}`}
          </p>
        </div>
        {status !== "ok" && daysLeft >= 0 ? (
          <span className="grid shrink-0 place-items-center text-center">
            <span className="text-2xl leading-none font-semibold tabular-nums">{daysLeft}</span>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">days</span>
          </span>
        ) : (
          <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground/70" aria-hidden />
        )}
      </Link>
    </li>
  );
}
