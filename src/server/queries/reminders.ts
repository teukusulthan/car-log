import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { todayInJakarta } from "@/lib/dates";
import { buildReminders, type Reminder } from "@/lib/reminders";
import { listDocuments } from "./documents";
import { getVehicleStatus, listVehicles } from "./vehicles";

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };
export type PushSender = (sub: StoredSubscription, payload: string) => Promise<{ ok: true } | { ok: false; gone: boolean }>;
export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(userId: string, sub: BrowserSubscription, userAgent?: string | null) {
  await db
    .insert(schema.pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent ?? null })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent: userAgent ?? null },
    });
}

export async function removeSubscription(userId: string, endpoint: string) {
  await db
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, userId), eq(schema.pushSubscriptions.endpoint, endpoint)));
}

async function householdSubscriptions() {
  const rows = await db
    .select({
      householdId: schema.householdMembers.householdId,
      id: schema.pushSubscriptions.id,
      endpoint: schema.pushSubscriptions.endpoint,
      p256dh: schema.pushSubscriptions.p256dh,
      auth: schema.pushSubscriptions.auth,
    })
    .from(schema.pushSubscriptions)
    .innerJoin(schema.householdMembers, eq(schema.householdMembers.userId, schema.pushSubscriptions.userId));
  const map = new Map<string, typeof rows>();
  for (const r of rows) map.set(r.householdId, [...(map.get(r.householdId) ?? []), r]);
  return map;
}

async function remindersFor(householdId: string, today: string): Promise<Reminder[]> {
  const vehicles = await listVehicles(householdId);
  const statuses = await Promise.all(vehicles.map((v) => getVehicleStatus(householdId, v.id, today)));
  const documents = await listDocuments(householdId, today);
  return buildReminders({
    today,
    documents,
    vehicles: statuses
      .filter((s) => s !== null)
      .map((s) => ({ id: s.vehicle.id, name: s.vehicle.name, lastReadingDate: s.lastReadingDate, items: s.items })),
  });
}

/** Records keys not sent before; returns only the newly recorded ones (atomic under concurrent runs). */
async function claimKeys(householdId: string, keys: string[]) {
  const rows = await db
    .insert(schema.notificationLog)
    .values(keys.map((key) => ({ householdId, key })))
    .onConflictDoNothing()
    .returning({ key: schema.notificationLog.key });
  return rows.map((r) => r.key);
}

async function releaseKeys(householdId: string, keys: string[]) {
  if (!keys.length) return;
  await db
    .delete(schema.notificationLog)
    .where(and(eq(schema.notificationLog.householdId, householdId), inArray(schema.notificationLog.key, keys)));
}

/**
 * Daily job: for every household with at least one device, send reminders it hasn't been sent for this cycle.
 * Never throws for a single failed delivery; returns counts for logging.
 */
export async function runReminders(now: Date, send: PushSender) {
  const today = todayInJakarta(now);
  const result = { households: 0, sent: 0, failed: 0, removed: 0 };

  for (const [householdId, subs] of await householdSubscriptions()) {
    result.households++;
    let devices = subs;
    try {
      for (const reminder of await remindersFor(householdId, today)) {
        const fresh = await claimKeys(householdId, reminder.keys);
        if (!fresh.length || !devices.length) continue;

        const payload = JSON.stringify({ title: reminder.title, body: reminder.body, url: reminder.url, tag: reminder.tag });
        let delivered = 0;
        for (const device of devices) {
          const res = await send(device, payload);
          if (res.ok) {
            delivered++;
          } else if (res.gone) {
            await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, device.id));
            devices = devices.filter((d) => d.id !== device.id);
            result.removed++;
          } else {
            result.failed++;
          }
        }
        result.sent += delivered;
        // Nobody received it: forget the keys so the next run tries again.
        if (!delivered) await releaseKeys(householdId, fresh);
      }
    } catch (error) {
      console.error(`[reminders] household ${householdId} failed`, error);
    }
  }
  return result;
}
