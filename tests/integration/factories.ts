import { sql } from "drizzle-orm";
import { db, schema } from "@/db";

const TABLES = [
  "notification_log",
  "push_subscriptions",
  "attachments",
  "documents",
  "service_record_items",
  "odometer_readings",
  "service_records",
  "maintenance_items",
  "vehicles",
  "invites",
  "household_members",
  "households",
  '"session"',
  '"account"',
  '"verificationToken"',
  '"user"',
];

export async function resetDb() {
  await db.execute(sql.raw(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`));
}

export async function closeDb() {
  await db.$client.end();
}

let seq = 0;

export async function makeUser(email = `user${++seq}@example.com`) {
  const [user] = await db.insert(schema.users).values({ email }).returning();
  return user;
}

/** A household with one owner and one vehicle (no maintenance items, one initial reading). */
export async function makeHousehold(opts: { odometer?: number; trackedSince?: string } = {}) {
  const user = await makeUser();
  const [household] = await db.insert(schema.households).values({ name: "Test garage" }).returning();
  await db
    .insert(schema.householdMembers)
    .values({ householdId: household.id, userId: user.id, role: "owner" });
  const trackedSince = opts.trackedSince ?? "2026-01-01";
  const [vehicle] = await db
    .insert(schema.vehicles)
    .values({ householdId: household.id, name: "Avanza", make: "Toyota", model: "Avanza", trackedSince })
    .returning();
  await db
    .insert(schema.odometerReadings)
    .values({ vehicleId: vehicle.id, km: opts.odometer ?? 1000, date: trackedSince, createdBy: user.id });
  return { householdId: household.id, userId: user.id, vehicleId: vehicle.id };
}
