import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { DocumentType } from "@/db/schema";
import type { ISODate } from "@/lib/dates";
import { renewalStatus } from "@/lib/documents";
import { NotFoundError } from "@/server/access-core";
import { assertVehicleInHousehold } from "./vehicles";

export type DocumentInput = {
  vehicleId: string;
  type: DocumentType;
  title: string;
  expiresOn: ISODate;
  remindDaysBefore: number;
  notes?: string | null;
};

async function assertDocumentInHousehold(householdId: string, id: string) {
  const [row] = await db
    .select({ id: schema.documents.id })
    .from(schema.documents)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.documents.vehicleId))
    .where(and(eq(schema.documents.id, id), eq(schema.vehicles.householdId, householdId)));
  if (!row) throw new NotFoundError("Document");
}

export async function createDocument(householdId: string, input: DocumentInput): Promise<string> {
  await assertVehicleInHousehold(householdId, input.vehicleId);
  const [row] = await db
    .insert(schema.documents)
    .values({ ...input, notes: input.notes ?? null })
    .returning({ id: schema.documents.id });
  return row.id;
}

export async function updateDocument(householdId: string, id: string, input: DocumentInput) {
  await assertDocumentInHousehold(householdId, id);
  await assertVehicleInHousehold(householdId, input.vehicleId);
  await db
    .update(schema.documents)
    .set({ ...input, notes: input.notes ?? null })
    .where(eq(schema.documents.id, id));
}

export async function renewDocument(householdId: string, id: string, expiresOn: ISODate) {
  await assertDocumentInHousehold(householdId, id);
  await db.update(schema.documents).set({ expiresOn }).where(eq(schema.documents.id, id));
}

/** Deletes the document; returns storage keys of its photos for cleanup. */
export async function deleteDocument(householdId: string, id: string): Promise<string[]> {
  await assertDocumentInHousehold(householdId, id);
  const files = await db
    .select({ key: schema.attachments.storageKey })
    .from(schema.attachments)
    .where(eq(schema.attachments.documentId, id));
  await db.delete(schema.documents).where(eq(schema.documents.id, id));
  return files.map((f) => f.key);
}

const documentColumns = {
  id: schema.documents.id,
  vehicleId: schema.documents.vehicleId,
  vehicleName: schema.vehicles.name,
  type: schema.documents.type,
  title: schema.documents.title,
  expiresOn: schema.documents.expiresOn,
  remindDaysBefore: schema.documents.remindDaysBefore,
  notes: schema.documents.notes,
};

export async function getDocument(householdId: string, id: string) {
  const [row] = await db
    .select(documentColumns)
    .from(schema.documents)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.documents.vehicleId))
    .where(and(eq(schema.documents.id, id), eq(schema.vehicles.householdId, householdId)));
  if (!row) return null;
  const attachments = await db
    .select({ id: schema.attachments.id })
    .from(schema.attachments)
    .where(eq(schema.attachments.documentId, id))
    .orderBy(asc(schema.attachments.createdAt));
  return { ...row, attachments };
}

/** Household documents (optionally for one vehicle), soonest expiry first, with renewal status for `today`. */
export async function listDocuments(householdId: string, today: ISODate, vehicleId?: string) {
  const rows = await db
    .select(documentColumns)
    .from(schema.documents)
    .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.documents.vehicleId))
    .where(
      vehicleId
        ? and(eq(schema.vehicles.householdId, householdId), eq(schema.documents.vehicleId, vehicleId))
        : eq(schema.vehicles.householdId, householdId),
    )
    .orderBy(asc(schema.documents.expiresOn));
  return rows.map((d) => ({ ...d, renewal: renewalStatus(d.expiresOn, d.remindDaysBefore, today) }));
}

export type DocumentListItem = Awaited<ReturnType<typeof listDocuments>>[number];
