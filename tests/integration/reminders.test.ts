import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@/db";
import { type PushSender, removeSubscription, runReminders, saveSubscription } from "@/server/queries/reminders";
import { createDocument } from "@/server/queries/documents";
import { createService } from "@/server/queries/services";
import { createVehicle, getVehicleStatus } from "@/server/queries/vehicles";
import { makeHousehold, makeUser } from "./factories";

const NOW = new Date("2026-09-20T01:00:00Z"); // 08:00 WIB
const sub = (n: number) => ({ endpoint: `https://push.example/${n}`, keys: { p256dh: `p${n}`, auth: `a${n}` } });

let sent: { endpoint: string; payload: { title: string; url: string } }[];
let gone: Set<string>;
let failing: Set<string>;
const sender: PushSender = async (s, payload) => {
  if (gone.has(s.endpoint)) return { ok: false, gone: true };
  if (failing.has(s.endpoint)) return { ok: false, gone: false };
  sent.push({ endpoint: s.endpoint, payload: JSON.parse(payload) });
  return { ok: true };
};

beforeEach(() => {
  sent = [];
  gone = new Set();
  failing = new Set();
});

async function householdWithOverdueOil() {
  const h = await makeHousehold();
  const vehicleId = await createVehicle(h.householdId, h.userId, {
    name: "Veloz",
    make: "Toyota",
    model: "Veloz",
    trackedSince: "2026-03-01",
    odometer: 1000,
  });
  // A fresh reading so the odometer nudge doesn't fire.
  await db.insert(schema.odometerReadings).values({ vehicleId, km: 1500, date: "2026-09-19" });
  await db.delete(schema.vehicles).where(eq(schema.vehicles.id, h.vehicleId)); // drop the factory car
  return { ...h, vehicleId };
}

describe("subscriptions", () => {
  it("saves one row per endpoint and re-assigns it on re-subscribe", async () => {
    const a = await makeUser();
    const b = await makeUser();
    await saveSubscription(a.id, sub(1));
    await saveSubscription(b.id, sub(1));
    const rows = await db.select().from(schema.pushSubscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(b.id);
    await removeSubscription(b.id, sub(1).endpoint);
    expect(await db.select().from(schema.pushSubscriptions)).toHaveLength(0);
  });
});

describe("runReminders", () => {
  it("sends due reminders to every member device once per cycle", async () => {
    const h = await householdWithOverdueOil();
    await saveSubscription(h.userId, sub(1));
    await saveSubscription(h.userId, sub(2));

    const first = await runReminders(NOW, sender);
    expect(first.sent).toBe(2);
    expect(sent.map((s) => s.endpoint).sort()).toEqual(["https://push.example/1", "https://push.example/2"]);
    expect(sent[0].payload.title).toMatch(/Veloz: \d+ services need attention/);

    sent = [];
    const second = await runReminders(NOW, sender);
    expect(second.sent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("notifies again after the item is serviced and becomes due again", async () => {
    const h = await householdWithOverdueOil();
    await saveSubscription(h.userId, sub(1));
    await runReminders(NOW, sender);
    const oil = (await getVehicleStatus(h.householdId, h.vehicleId, "2026-09-20"))!.items.find((i) => i.name === "Engine oil")!;
    await createService(h.householdId, h.userId, {
      vehicleId: h.vehicleId,
      date: "2026-09-20",
      odometer: 1600,
      totalCost: 0,
      items: [{ maintenanceItemId: oil.id, label: "Engine oil" }],
    });
    sent = [];
    await runReminders(new Date("2027-03-25T01:00:00Z"), sender);
    expect(sent.some((s) => s.payload.title.includes("Engine oil") || s.payload.title.includes("services"))).toBe(true);
  });

  it("skips households without devices, so enabling notifications later still delivers", async () => {
    const h = await householdWithOverdueOil();
    expect((await runReminders(NOW, sender)).sent).toBe(0);
    await saveSubscription(h.userId, sub(1));
    expect((await runReminders(NOW, sender)).sent).toBe(1);
  });

  it("removes expired subscriptions and retries when nothing was delivered", async () => {
    const h = await householdWithOverdueOil();
    await saveSubscription(h.userId, sub(1));
    await saveSubscription(h.userId, sub(2));
    gone.add(sub(1).endpoint);
    failing.add(sub(2).endpoint);
    const res = await runReminders(NOW, sender);
    expect(res).toMatchObject({ sent: 0, failed: 1, removed: 1 });
    expect((await db.select().from(schema.pushSubscriptions)).map((r) => r.endpoint)).toEqual([sub(2).endpoint]);

    failing.clear();
    expect((await runReminders(NOW, sender)).sent).toBe(1);
  });

  it("includes document renewals and keeps households separate", async () => {
    const a = await householdWithOverdueOil();
    const b = await makeHousehold();
    await saveSubscription(a.userId, sub(1));
    await saveSubscription(b.userId, sub(2));
    await createDocument(a.householdId, {
      vehicleId: a.vehicleId,
      type: "insurance",
      title: "Car insurance",
      expiresOn: "2026-09-25",
      remindDaysBefore: 30,
    });
    await runReminders(NOW, sender);
    const toA = sent.filter((s) => s.endpoint === sub(1).endpoint).map((s) => s.payload.title);
    const toB = sent.filter((s) => s.endpoint === sub(2).endpoint).map((s) => s.payload.title);
    expect(toA).toContain("Car insurance expires in 5 days");
    expect(toB.join()).not.toContain("Car insurance");
  });
});

describe("runReminders when every device disappears mid-run", () => {
  it("doesn't mark later reminders as sent, so a re-subscribed device gets them all", async () => {
    const h = await householdWithOverdueOil();
    await createDocument(h.householdId, {
      vehicleId: h.vehicleId,
      type: "insurance",
      title: "Car insurance",
      expiresOn: "2026-09-25",
      remindDaysBefore: 30,
    });
    await saveSubscription(h.userId, sub(1));
    gone.add(sub(1).endpoint);
    await runReminders(NOW, sender);

    gone.clear();
    await saveSubscription(h.userId, sub(3));
    await runReminders(NOW, sender);
    const titles = sent.map((s) => s.payload.title);
    expect(titles).toContain("Car insurance expires in 5 days");
    expect(titles.some((t) => t.includes("Veloz"))).toBe(true);
  });
});
