import { diffDays, type ISODate } from "./dates";

export type RenewalStatus = { status: "expired" | "due_soon" | "ok"; daysLeft: number };

export function renewalStatus(expiresOn: ISODate, remindDaysBefore: number, today: ISODate): RenewalStatus {
  const daysLeft = diffDays(today, expiresOn);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= remindDaysBefore) return { status: "due_soon", daysLeft };
  return { status: "ok", daysLeft };
}
