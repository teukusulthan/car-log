import { diffDays, type ISODate } from "./dates";
import { type DueResult, STALE_READING_DAYS, compareDue } from "./due";
import type { RenewalStatus } from "./documents";
import { describeDue } from "./format";

export type ReminderInput = {
  today: ISODate;
  vehicles: {
    id: string;
    name: string;
    lastReadingDate: ISODate | null;
    items: { id: string; name: string; due: DueResult; baseline: { date: ISODate; km: number } }[];
  }[];
  documents: { id: string; title: string; vehicleName: string; expiresOn: ISODate; renewal: RenewalStatus }[];
};

/** One push notification. `keys` identify what it announces, for "send once per cycle" deduplication. */
export type Reminder = { keys: string[]; title: string; body: string; url: string; tag: string };

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function buildReminders({ today, vehicles, documents }: ReminderInput): Reminder[] {
  const out: Reminder[] = [];

  for (const v of vehicles) {
    const due = v.items.filter((i) => i.due.status !== "ok").sort((a, b) => compareDue(a.due, b.due));
    if (due.length) {
      const keys = due.map((i) => `item:${i.id}:${i.baseline.date}@${i.baseline.km}:${i.due.status}`);
      const single = due.length === 1 ? due[0] : null;
      out.push({
        keys,
        tag: `vehicle-${v.id}`,
        title: single
          ? `${single.name} ${single.due.status === "overdue" ? "is overdue" : "due soon"} · ${v.name}`
          : `${v.name}: ${due.length} services need attention`,
        body: due.map((i) => `${i.name} — ${lowerFirst(describeDue(i.due, today))}`).join(" · "),
        url: single ? `/log?vehicle=${v.id}&item=${single.id}` : `/?vehicle=${v.id}`,
      });
    }

    if (v.lastReadingDate) {
      const age = diffDays(v.lastReadingDate, today);
      if (age > STALE_READING_DAYS) {
        out.push({
          keys: [`odo:${v.id}:${v.lastReadingDate}:${Math.floor(age / STALE_READING_DAYS)}`],
          tag: `odometer-${v.id}`,
          title: `How many km on ${v.name}?`,
          body: "Update the odometer so km-based reminders stay accurate.",
          url: `/?vehicle=${v.id}`,
        });
      }
    }
  }

  for (const d of documents) {
    if (d.renewal.status === "ok") continue;
    const { daysLeft } = d.renewal;
    const when = daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
    out.push({
      keys: [`doc:${d.id}:${d.expiresOn}:${d.renewal.status}`],
      tag: `document-${d.id}`,
      title: d.renewal.status === "expired" ? `${d.title} has expired` : `${d.title} expires ${when}`,
      body: `${d.vehicleName} — tap to update it once renewed.`,
      url: `/documents/${d.id}`,
    });
  }

  return out;
}
