import { describe, expect, it } from "vitest";
import type { DueResult } from "@/lib/due";
import { buildReminders, type ReminderInput } from "@/lib/reminders";

const TODAY = "2026-09-20";
const ok: DueResult = { status: "ok", dueDate: null, dueKm: 20000, daysLeft: null, kmLeft: 5000, projectedDate: null };
const soon: DueResult = { ...ok, status: "due_soon", kmLeft: 400 };
const late: DueResult = { ...ok, status: "overdue", kmLeft: -1200 };

function input(overrides: Partial<ReminderInput> = {}): ReminderInput {
  return {
    today: TODAY,
    vehicles: [
      {
        id: "v1",
        name: "Veloz",
        lastReadingDate: "2026-09-18",
        items: [
          { id: "oil", name: "Engine oil", due: late, baseline: { date: "2026-03-01", km: 10000 } },
          { id: "filter", name: "Oil filter", due: soon, baseline: { date: "2026-03-01", km: 10000 } },
          { id: "coolant", name: "Coolant", due: ok, baseline: { date: "2026-03-01", km: 10000 } },
        ],
      },
    ],
    documents: [],
    ...overrides,
  };
}

describe("buildReminders", () => {
  it("groups a car's due items into one notification, overdue first", () => {
    const [n, ...rest] = buildReminders(input());
    expect(rest).toHaveLength(0);
    expect(n.title).toBe("Veloz: 2 services need attention");
    expect(n.body).toBe("Engine oil — overdue by 1.200 km · Oil filter — due in 400 km");
    expect(n.keys).toEqual([
      "item:oil:2026-03-01@10000:overdue",
      "item:filter:2026-03-01@10000:due_soon",
    ]);
    expect(n.url).toBe("/?vehicle=v1");
  });

  it("uses a single-item title and deep-links to logging it", () => {
    const v = input().vehicles[0];
    const [n] = buildReminders(input({ vehicles: [{ ...v, items: [v.items[1]] }] }));
    expect(n.title).toBe("Oil filter due soon · Veloz");
    expect(n.url).toBe("/log?vehicle=v1&item=filter");
  });

  it("produces a new key after the item is serviced (new cycle)", () => {
    const v = input().vehicles[0];
    const serviced = { ...v.items[0], baseline: { date: "2026-09-19", km: 20100 } };
    const [n] = buildReminders(input({ vehicles: [{ ...v, items: [serviced] }] }));
    expect(n.keys).toEqual(["item:oil:2026-09-19@20100:overdue"]);
  });

  it("stays silent for items that are ok", () => {
    const v = input().vehicles[0];
    expect(buildReminders(input({ vehicles: [{ ...v, items: [v.items[2]] }] }))).toEqual([]);
  });

  it("nudges for a stale odometer at most once per 14-day window", () => {
    const v = { ...input().vehicles[0], items: [], lastReadingDate: "2026-09-01" };
    const [n] = buildReminders(input({ vehicles: [v] }));
    expect(n.keys).toEqual(["odo:v1:2026-09-01:1"]);
    expect(n.title).toBe("How many km on Veloz?");
    const later = buildReminders(input({ vehicles: [v], today: "2026-10-10" }));
    expect(later[0].keys).toEqual(["odo:v1:2026-09-01:2"]);
    expect(buildReminders(input({ vehicles: [{ ...v, lastReadingDate: "2026-09-10" }] }))).toEqual([]);
  });

  it("notifies each expiring or expired document", () => {
    const docs = [
      { id: "d1", title: "Car insurance", vehicleName: "Veloz", expiresOn: "2026-09-27", renewal: { status: "due_soon" as const, daysLeft: 7 } },
      { id: "d2", title: "STNK tax", vehicleName: "Veloz", expiresOn: "2026-09-19", renewal: { status: "expired" as const, daysLeft: -1 } },
      { id: "d3", title: "KIR", vehicleName: "Veloz", expiresOn: "2027-09-19", renewal: { status: "ok" as const, daysLeft: 364 } },
    ];
    const v = { ...input().vehicles[0], items: [] };
    const out = buildReminders(input({ vehicles: [v], documents: docs }));
    expect(out.map((n) => [n.title, n.keys[0], n.url])).toEqual([
      ["Car insurance expires in 7 days", "doc:d1:2026-09-27:due_soon", "/documents/d1"],
      ["STNK tax has expired", "doc:d2:2026-09-19:expired", "/documents/d2"],
    ]);
  });
});
