import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, max, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import type { ISODate } from "@/lib/dates";
import { NotFoundError } from "@/server/access-core";
import { assertVehicleInHousehold } from "./vehicles";

export type ServiceItemInput = { maintenanceItemId?: string | null; label: string; cost?: number | null };

export type ServiceInput = {
  vehicleId: string;
  date: ISODate;
  odometer: number;
  workshop?: string | null;
  notes?: string | null;
  totalCost: number;
  items: ServiceItemInput[];
};

/** Keeps only maintenance item ids that belong to `vehicleId`; foreign ids become plain labels. */
async function sanitizeItems(tx: Tx, vehicleId: string, items: ServiceItemInput[]) {
  const ids = items.map((i) => i.maintenanceItemId).filter((id): id is string => Boolean(id));
  const own = ids.length
    ? new Set(
        (
          await tx
            .select({ id: schema.maintenanceItems.id })
            .from(schema.maintenanceItems)
            .where(and(eq(schema.maintenanceItems.vehicleId, vehicleId), inArray(schema.maintenanceItems.id, ids)))
        ).map((r) => r.id),
      )
    : new Set<string>();
  return items.map((i, position) => ({
    position,
    maintenanceItemId: i.maintenanceItemId && own.has(i.maintenanceItemId) ? i.maintenanceItemId : null,
    label: i.label,
    cost: i.cost ?? null,
  }));
}

/** Returns the record's vehicle id if the record belongs to the household, else throws NotFoundError. */
async function assertServiceInHousehold(tx: Tx | typeof db, householdId: string, recordId: string) {
  const [row] = await tx
    .select({ vehicleId: schema.serviceRecords.vehicleId })
    .from(schema.serviceRecords)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
    .where(and(eq(schema.serviceRecords.id, recordId), eq(schema.vehicles.householdId, householdId)));
  if (!row) throw new NotFoundError("Service record");
  return row.vehicleId;
}

export async function createService(householdId: string, userId: string, input: ServiceInput): Promise<string> {
  return db.transaction(async (tx) => {
    await assertVehicleInHousehold(householdId, input.vehicleId, tx);
    const [record] = await tx
      .insert(schema.serviceRecords)
      .values({
        vehicleId: input.vehicleId,
        date: input.date,
        odometer: input.odometer,
        workshop: input.workshop ?? null,
        notes: input.notes ?? null,
        totalCost: input.totalCost,
        createdBy: userId,
      })
      .returning({ id: schema.serviceRecords.id });
    const items = await sanitizeItems(tx, input.vehicleId, input.items);
    if (items.length) {
      await tx.insert(schema.serviceRecordItems).values(items.map((i) => ({ ...i, serviceRecordId: record.id })));
    }
    await tx.insert(schema.odometerReadings).values({
      vehicleId: input.vehicleId,
      km: input.odometer,
      date: input.date,
      serviceRecordId: record.id,
      createdBy: userId,
    });
    return record.id;
  });
}

export async function updateService(householdId: string, recordId: string, input: ServiceInput) {
  await db.transaction(async (tx) => {
    const vehicleId = await assertServiceInHousehold(tx, householdId, recordId);
    // A record never moves between vehicles; the form doesn't offer it.
    await tx
      .update(schema.serviceRecords)
      .set({
        date: input.date,
        odometer: input.odometer,
        workshop: input.workshop ?? null,
        notes: input.notes ?? null,
        totalCost: input.totalCost,
      })
      .where(eq(schema.serviceRecords.id, recordId));
    await tx.delete(schema.serviceRecordItems).where(eq(schema.serviceRecordItems.serviceRecordId, recordId));
    const items = await sanitizeItems(tx, vehicleId, input.items);
    if (items.length) {
      await tx.insert(schema.serviceRecordItems).values(items.map((i) => ({ ...i, serviceRecordId: recordId })));
    }
    await tx
      .update(schema.odometerReadings)
      .set({ km: input.odometer, date: input.date })
      .where(eq(schema.odometerReadings.serviceRecordId, recordId));
  });
}

/** Deletes the record (items, reading and attachment rows cascade). Returns storage keys to clean up. */
export async function deleteService(householdId: string, recordId: string): Promise<string[]> {
  return db.transaction(async (tx) => {
    await assertServiceInHousehold(tx, householdId, recordId);
    const files = await tx
      .select({ key: schema.attachments.storageKey })
      .from(schema.attachments)
      .where(eq(schema.attachments.serviceRecordId, recordId));
    await tx.delete(schema.serviceRecords).where(eq(schema.serviceRecords.id, recordId));
    return files.map((f) => f.key);
  });
}

export async function getService(householdId: string, recordId: string) {
  const [record] = await db
    .select({
      id: schema.serviceRecords.id,
      vehicleId: schema.serviceRecords.vehicleId,
      vehicleName: schema.vehicles.name,
      date: schema.serviceRecords.date,
      odometer: schema.serviceRecords.odometer,
      workshop: schema.serviceRecords.workshop,
      notes: schema.serviceRecords.notes,
      totalCost: schema.serviceRecords.totalCost,
      createdBy: schema.users.name,
    })
    .from(schema.serviceRecords)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
    .leftJoin(schema.users, eq(schema.users.id, schema.serviceRecords.createdBy))
    .where(and(eq(schema.serviceRecords.id, recordId), eq(schema.vehicles.householdId, householdId)));
  if (!record) return null;
  const [items, attachments] = await Promise.all([
    db
      .select({
        id: schema.serviceRecordItems.id,
        maintenanceItemId: schema.serviceRecordItems.maintenanceItemId,
        label: schema.serviceRecordItems.label,
        cost: schema.serviceRecordItems.cost,
      })
      .from(schema.serviceRecordItems)
      .where(eq(schema.serviceRecordItems.serviceRecordId, recordId))
      .orderBy(asc(schema.serviceRecordItems.position)),
    db
      .select({ id: schema.attachments.id, contentType: schema.attachments.contentType })
      .from(schema.attachments)
      .where(eq(schema.attachments.serviceRecordId, recordId))
      .orderBy(asc(schema.attachments.createdAt)),
  ]);
  return { ...record, items, attachments };
}

export type ServiceDetail = NonNullable<Awaited<ReturnType<typeof getService>>>;

export async function listWorkshops(householdId: string): Promise<string[]> {
  const rows = await db
    .select({ workshop: schema.serviceRecords.workshop, lastUsed: max(schema.serviceRecords.date) })
    .from(schema.serviceRecords)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
    .where(and(eq(schema.vehicles.householdId, householdId), isNotNull(schema.serviceRecords.workshop)))
    .groupBy(schema.serviceRecords.workshop)
    .orderBy(desc(max(schema.serviceRecords.date)))
    .limit(20);
  return rows.map((r) => r.workshop!);
}

export const OTHER_LABEL = "Other / labour";

export type ServiceListItem = {
  id: string;
  date: ISODate;
  odometer: number;
  workshop: string | null;
  totalCost: number;
  labels: string[];
  photoCount: number;
};

export async function listServices(householdId: string, vehicleId: string): Promise<ServiceListItem[]> {
  const records = await db
    .select({
      id: schema.serviceRecords.id,
      date: schema.serviceRecords.date,
      odometer: schema.serviceRecords.odometer,
      workshop: schema.serviceRecords.workshop,
      totalCost: schema.serviceRecords.totalCost,
    })
    .from(schema.serviceRecords)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
    .where(and(eq(schema.serviceRecords.vehicleId, vehicleId), eq(schema.vehicles.householdId, householdId)))
    .orderBy(desc(schema.serviceRecords.date), desc(schema.serviceRecords.odometer), desc(schema.serviceRecords.createdAt));
  if (!records.length) return [];

  const ids = records.map((r) => r.id);
  const [items, photos] = await Promise.all([
    db
      .select({ recordId: schema.serviceRecordItems.serviceRecordId, label: schema.serviceRecordItems.label })
      .from(schema.serviceRecordItems)
      .where(inArray(schema.serviceRecordItems.serviceRecordId, ids))
      .orderBy(asc(schema.serviceRecordItems.position)),
    db
      .select({ recordId: schema.attachments.serviceRecordId, n: count() })
      .from(schema.attachments)
      .where(inArray(schema.attachments.serviceRecordId, ids))
      .groupBy(schema.attachments.serviceRecordId),
  ]);
  const labels = new Map<string, string[]>();
  for (const i of items) labels.set(i.recordId, [...(labels.get(i.recordId) ?? []), i.label]);
  const photoCounts = new Map(photos.map((p) => [p.recordId!, p.n]));
  return records.map((r) => ({ ...r, labels: labels.get(r.id) ?? [], photoCount: photoCounts.get(r.id) ?? 0 }));
}

export type CostSummary = {
  year: number;
  total: number;
  serviceCount: number;
  byMonth: number[];
  byItem: { label: string; total: number }[];
};

export async function costSummary(householdId: string, vehicleId: string, year: number): Promise<CostSummary> {
  const records = await db
    .select({ id: schema.serviceRecords.id, date: schema.serviceRecords.date, totalCost: schema.serviceRecords.totalCost })
    .from(schema.serviceRecords)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
    .where(
      and(
        eq(schema.serviceRecords.vehicleId, vehicleId),
        eq(schema.vehicles.householdId, householdId),
        gte(schema.serviceRecords.date, `${year}-01-01`),
        lte(schema.serviceRecords.date, `${year}-12-31`),
      ),
    );

  const byMonth = Array.from({ length: 12 }, () => 0);
  const byItem = new Map<string, number>();
  if (records.length) {
    const items = await db
      .select({
        recordId: schema.serviceRecordItems.serviceRecordId,
        label: schema.serviceRecordItems.label,
        cost: schema.serviceRecordItems.cost,
      })
      .from(schema.serviceRecordItems)
      .where(inArray(schema.serviceRecordItems.serviceRecordId, records.map((r) => r.id)));
    const itemized = new Map<string, number>();
    for (const i of items) {
      if (!i.cost) continue;
      byItem.set(i.label, (byItem.get(i.label) ?? 0) + i.cost);
      itemized.set(i.recordId, (itemized.get(i.recordId) ?? 0) + i.cost);
    }
    for (const r of records) {
      byMonth[Number(r.date.slice(5, 7)) - 1] += r.totalCost;
      const rest = r.totalCost - (itemized.get(r.id) ?? 0);
      if (rest > 0) byItem.set(OTHER_LABEL, (byItem.get(OTHER_LABEL) ?? 0) + rest);
    }
  }

  return {
    year,
    total: records.reduce((sum, r) => sum + r.totalCost, 0),
    serviceCount: records.length,
    byMonth,
    byItem: [...byItem.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total),
  };
}

export async function listServiceYears(householdId: string, vehicleId: string): Promise<number[]> {
  const year = sql<number>`extract(year from ${schema.serviceRecords.date})::int`;
  const rows = await db
    .selectDistinct({ year })
    .from(schema.serviceRecords)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
    .where(and(eq(schema.serviceRecords.vehicleId, vehicleId), eq(schema.vehicles.householdId, householdId)))
    .orderBy(desc(year));
  return rows.map((r) => r.year);
}
