import { diffDays, type ISODate } from "./dates";
import type { DueResult } from "./due";

const idNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatNumber(n: number): string {
  return idNumber.format(n);
}

export function formatIDR(n: number): string {
  return `Rp ${idNumber.format(n)}`;
}

export function formatKm(n: number): string {
  return `${idNumber.format(n)} km`;
}

function parts(d: ISODate) {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m, day };
}

export function formatDate(d: ISODate): string {
  const { y, m, day } = parts(d);
  return `${day} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function formatShortDate(d: ISODate): string {
  const { m, day } = parts(d);
  return `${day} ${MONTHS_SHORT[m - 1]}`;
}

export function formatMonth(d: ISODate): string {
  const { y, m } = parts(d);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

function span(days: number): string {
  if (days < 14) return plural(days, "day");
  if (days < 60) return plural(Math.round(days / 7), "week");
  return plural(Math.round(days / 30), "month");
}

/** "today", "tomorrow", "in 5 days", "in 3 weeks", "in 3 months". */
export function describeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${span(days)}`;
}

/** One short line for a maintenance item's due state, e.g. "Due in 400 km" or "Overdue by 12 days". */
export function describeDue(due: DueResult, today?: ISODate): string {
  const { status, daysLeft, kmLeft, projectedDate } = due;

  if (status === "overdue") {
    if (kmLeft !== null && kmLeft < 0) return `Overdue by ${formatKm(-kmLeft)}`;
    return `Overdue by ${plural(-(daysLeft ?? 0), "day")}`;
  }

  if (status === "due_soon") {
    if (kmLeft !== null && kmLeft <= 500) return `Due in ${formatKm(kmLeft)}`;
    if (daysLeft !== null && daysLeft <= 14) {
      return daysLeft <= 1 ? `Due ${describeDays(daysLeft)}` : `Due in ${plural(daysLeft, "day")}`;
    }
    if (projectedDate && today) return `Due in ~${plural(diffDays(today, projectedDate), "day")}`;
    return "Due soon";
  }

  const limits: string[] = [];
  if (kmLeft !== null) limits.push(formatKm(kmLeft));
  if (daysLeft !== null) limits.push(span(daysLeft));
  return limits.length ? `In ${limits.join(" or ")}` : "No schedule";
}

/** "today", "yesterday", "9 days ago", "2 months ago". */
export function describeAgo(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${span(days)} ago`;
}
