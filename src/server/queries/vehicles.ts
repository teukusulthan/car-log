import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import type { ISODate } from "@/lib/dates";
import { type DueResult, compareDue, computeDue } from "@/lib/due";
import { DEFAULT_SCHEDULE } from "@/lib/maintenance-template";
import { averageDailyKm, latestReading, type Reading } from "@/lib/odometer";
import { NotFoundError } from "@/server/access-core";

export type Vehicle = typeof schema.vehicles.$inferSelect;
export type MaintenanceItem = typeof schema.maintenanceItems.$inferSelect;

export type VehicleInput = {
  name: string;
  make: string;
  model: string;
  year?: number | null;
  plate?: string | null;
  trackedSince: ISODate;
  odometer: number;
};

export type ScheduleItemInput = { id?: string; name: string; intervalKm: number | null; intervalMonths: number | null };

export type VehicleStatusItem = MaintenanceItem & {
  /** Most recent service that included this item, if any. */
  last: { date: ISODate; km: number } | null;
  /** What the due calculation counts from: `last`, or the vehicle's tracking start. */
  baseline: { date: ISODate; km: number };
  due: DueResult;
};

export type VehicleStatus = {
  vehicle: Vehicle;
  currentKm: number;
  lastReadingDate: ISODate | null;
  avgDailyKm: number | null;
  items: VehicleStatusItem[];
};

/** Throws NotFoundError unless the vehicle belongs to the household. Use inside every write. */
export async function assertVehicleInHousehold(householdId: string, vehicleId: string, tx: Tx | typeof db = db) {
  const [row] = await tx
    .select({ id: schema.vehicles.id })
    .from(schema.vehicles)
    .where(and(eq(schema.vehicles.id, vehicleId), eq(schema.vehicles.householdId, householdId)));
  if (!row) throw new NotFoundError("Vehicle");
}

export async function createVehicle(householdId: string, userId: string, input: VehicleInput): Promise<string> {
  return db.transaction(async (tx) => {
    const [vehicle] = await tx
      .insert(schema.vehicles)
      .values({
        householdId,
        name: input.name,
        make: input.make,
        model: input.model,
        year: input.year ?? null,
        plate: input.plate ?? null,
        trackedSince: input.trackedSince,
      })
      .returning({ id: schema.vehicles.id });
    await tx.insert(schema.maintenanceItems).values(
      DEFAULT_SCHEDULE.map((item, sort) => ({ ...item, vehicleId: vehicle.id, sort })),
    );
    await tx
      .insert(schema.odometerReadings)
      .values({ vehicleId: vehicle.id, km: input.odometer, date: input.trackedSince, createdBy: userId });
    return vehicle.id;
  });
}

export async function getVehicle(householdId: string, vehicleId: string): Promise<Vehicle | null> {
  const [row] = await db
    .select()
    .from(schema.vehicles)
    .where(and(eq(schema.vehicles.id, vehicleId), eq(schema.vehicles.householdId, householdId)));
  return row ?? null;
}

export async function listVehicles(householdId: string): Promise<Vehicle[]> {
  return db
    .select()
    .from(schema.vehicles)
    .where(eq(schema.vehicles.householdId, householdId))
    .orderBy(asc(schema.vehicles.createdAt));
}

export async function updateVehicle(householdId: string, vehicleId: string, input: Omit<VehicleInput, "odometer" | "trackedSince"> & Partial<VehicleInput>) {
  await assertVehicleInHousehold(householdId, vehicleId);
  await db
    .update(schema.vehicles)
    .set({ name: input.name, make: input.make, model: input.model, year: input.year ?? null, plate: input.plate ?? null })
    .where(eq(schema.vehicles.id, vehicleId));
}

export async function deleteVehicle(householdId: string, vehicleId: string) {
  await assertVehicleInHousehold(householdId, vehicleId);
  await db.delete(schema.vehicles).where(eq(schema.vehicles.id, vehicleId));
}

/** Replaces the vehicle's schedule with `items`: updates matching ids, inserts new ones, deletes the rest. */
export async function saveSchedule(householdId: string, vehicleId: string, items: ScheduleItemInput[]) {
  await db.transaction(async (tx) => {
    await assertVehicleInHousehold(householdId, vehicleId, tx);
    const existing = await tx
      .select({ id: schema.maintenanceItems.id })
      .from(schema.maintenanceItems)
      .where(eq(schema.maintenanceItems.vehicleId, vehicleId));
    const ownIds = new Set(existing.map((r) => r.id));
    const keep = items.filter((i) => i.id && ownIds.has(i.id)).map((i) => i.id!);

    await tx
      .delete(schema.maintenanceItems)
      .where(
        keep.length
          ? and(eq(schema.maintenanceItems.vehicleId, vehicleId), notInArray(schema.maintenanceItems.id, keep))
          : eq(schema.maintenanceItems.vehicleId, vehicleId),
      );

    for (const [sort, item] of items.entries()) {
      const values = { name: item.name, intervalKm: item.intervalKm, intervalMonths: item.intervalMonths, sort };
      if (item.id && ownIds.has(item.id)) {
        await tx.update(schema.maintenanceItems).set(values).where(eq(schema.maintenanceItems.id, item.id));
      } else {
        await tx.insert(schema.maintenanceItems).values({ ...values, vehicleId });
      }
    }
  });
}

export async function addReading(
  householdId: string,
  vehicleId: string,
  userId: string,
  reading: { km: number; date: ISODate },
) {
  await assertVehicleInHousehold(householdId, vehicleId);
  await db.insert(schema.odometerReadings).values({ vehicleId, km: reading.km, date: reading.date, createdBy: userId });
}

export async function listReadings(householdId: string, vehicleId: string) {
  await assertVehicleInHousehold(householdId, vehicleId);
  return db
    .select({ id: schema.odometerReadings.id, km: schema.odometerReadings.km, date: schema.odometerReadings.date })
    .from(schema.odometerReadings)
    .where(eq(schema.odometerReadings.vehicleId, vehicleId))
    .orderBy(desc(schema.odometerReadings.date), desc(schema.odometerReadings.km));
}

async function readingsFor(vehicleIds: string[]) {
  if (!vehicleIds.length) return new Map<string, Reading[]>();
  const rows = await db
    .select({ vehicleId: schema.odometerReadings.vehicleId, km: schema.odometerReadings.km, date: schema.odometerReadings.date })
    .from(schema.odometerReadings)
    .where(inArray(schema.odometerReadings.vehicleId, vehicleIds));
  const map = new Map<string, Reading[]>();
  for (const r of rows) map.set(r.vehicleId, [...(map.get(r.vehicleId) ?? []), { km: r.km, date: r.date }]);
  return map;
}

async function lastDoneFor(vehicleId: string) {
  const rows = await db
    .selectDistinctOn([schema.serviceRecordItems.maintenanceItemId], {
      itemId: schema.serviceRecordItems.maintenanceItemId,
      date: schema.serviceRecords.date,
      km: schema.serviceRecords.odometer,
    })
    .from(schema.serviceRecordItems)
    .innerJoin(schema.serviceRecords, eq(schema.serviceRecords.id, schema.serviceRecordItems.serviceRecordId))
    .where(and(eq(schema.serviceRecords.vehicleId, vehicleId), isNotNull(schema.serviceRecordItems.maintenanceItemId)))
    .orderBy(
      schema.serviceRecordItems.maintenanceItemId,
      desc(schema.serviceRecords.date),
      desc(schema.serviceRecords.odometer),
    );
  return new Map(rows.map((r) => [r.itemId!, { date: r.date, km: r.km }]));
}

/** Everything the Home screen needs for one vehicle: current km, driving rate, and every item's due state. */
export async function getVehicleStatus(householdId: string, vehicleId: string, today: ISODate): Promise<VehicleStatus | null> {
  const vehicle = await getVehicle(householdId, vehicleId);
  if (!vehicle) return null;

  const [readingsMap, lastDone, items] = await Promise.all([
    readingsFor([vehicleId]),
    lastDoneFor(vehicleId),
    db
      .select()
      .from(schema.maintenanceItems)
      .where(eq(schema.maintenanceItems.vehicleId, vehicleId))
      .orderBy(asc(schema.maintenanceItems.sort)),
  ]);

  const readings = readingsMap.get(vehicleId) ?? [];
  const latest = latestReading(readings);
  // Baseline km: the reading taken when tracking started (falls back to the lowest reading on record).
  const initial =
    readings.filter((r) => r.date === vehicle.trackedSince).sort((a, b) => a.km - b.km)[0] ??
    [...readings].sort((a, b) => a.km - b.km)[0];
  const currentKm = latest?.km ?? 0;
  const avgDailyKm = averageDailyKm(readings, today);
  const start = { date: vehicle.trackedSince, km: initial?.km ?? 0 };

  const statusItems = items
    .map((item) => {
      const last = lastDone.get(item.id) ?? null;
      const baseline = last ?? start;
      const due = computeDue(
        { intervalKm: item.intervalKm, intervalMonths: item.intervalMonths, last: baseline },
        { today, currentKm, avgDailyKm },
      );
      return { ...item, last, baseline, due };
    })
    .sort((a, b) => compareDue(a.due, b.due));

  return { vehicle, currentKm, lastReadingDate: latest?.date ?? null, avgDailyKm, items: statusItems };
}
