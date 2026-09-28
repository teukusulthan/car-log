import { addDays, addMonths, diffDays, type ISODate } from "./dates";

export const DUE_SOON_DAYS = 14;
export const DUE_SOON_KM = 500;
/** Ask for a fresh odometer reading when the last one is older than this. */
export const STALE_READING_DAYS = 14;

export type DueStatus = "overdue" | "due_soon" | "ok";

export type DueInput = {
  intervalKm: number | null;
  intervalMonths: number | null;
  /** When and at what odometer the item was last done (or the tracking baseline). */
  last: { date: ISODate; km: number };
};

export type DueContext = { today: ISODate; currentKm: number; avgDailyKm: number | null };

export type DueResult = {
  status: DueStatus;
  dueDate: ISODate | null;
  dueKm: number | null;
  daysLeft: number | null;
  kmLeft: number | null;
  /** Estimated date the km limit is reached, based on recent driving. */
  projectedDate: ISODate | null;
};

export function computeDue(input: DueInput, ctx: DueContext): DueResult {
  const dueDate = input.intervalMonths ? addMonths(input.last.date, input.intervalMonths) : null;
  const dueKm = input.intervalKm ? input.last.km + input.intervalKm : null;
  const daysLeft = dueDate ? diffDays(ctx.today, dueDate) : null;
  const kmLeft = dueKm !== null ? dueKm - ctx.currentKm : null;
  const projectedDate =
    kmLeft !== null && kmLeft >= 0 && ctx.avgDailyKm
      ? addDays(ctx.today, Math.floor(kmLeft / ctx.avgDailyKm))
      : null;
  const projectedDays = projectedDate ? diffDays(ctx.today, projectedDate) : null;

  let status: DueStatus = "ok";
  if ((daysLeft !== null && daysLeft < 0) || (kmLeft !== null && kmLeft < 0)) {
    status = "overdue";
  } else if (
    (daysLeft !== null && daysLeft <= DUE_SOON_DAYS) ||
    (kmLeft !== null && kmLeft <= DUE_SOON_KM) ||
    (projectedDays !== null && projectedDays <= DUE_SOON_DAYS)
  ) {
    status = "due_soon";
  }

  return { status, dueDate, dueKm, daysLeft, kmLeft, projectedDate };
}

const STATUS_RANK: Record<DueStatus, number> = { overdue: 0, due_soon: 1, ok: 2 };
/** Rough km/day used only to rank km-only items against date-based ones when no driving data exists. */
const FALLBACK_KM_PER_DAY = 40;

function urgencyDays(r: DueResult): number {
  const candidates: number[] = [];
  if (r.daysLeft !== null) candidates.push(r.daysLeft);
  if (r.kmLeft !== null) candidates.push(r.kmLeft / FALLBACK_KM_PER_DAY);
  return candidates.length ? Math.min(...candidates) : Number.POSITIVE_INFINITY;
}

/** Sort comparator: overdue first, then due soon, then ok; within a group the most urgent first. */
export function compareDue(a: DueResult, b: DueResult): number {
  return STATUS_RANK[a.status] - STATUS_RANK[b.status] || urgencyDays(a) - urgencyDays(b);
}
