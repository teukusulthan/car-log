import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { MAX_UPLOAD_BYTES } from "@/lib/image-compress";
import { sniffImageType } from "@/lib/sniff";
import { NotFoundError } from "@/server/access-core";
import { removeStoredFiles, storage } from "@/server/storage";

export const MAX_ATTACHMENTS_PER_OWNER = 6;

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentError";
  }
}

export type AttachmentOwner = { serviceRecordId: string } | { documentId: string };

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" } as const;

async function assertOwnerInHousehold(householdId: string, owner: AttachmentOwner) {
  const [row] =
    "serviceRecordId" in owner
      ? await db
          .select({ id: schema.serviceRecords.id })
          .from(schema.serviceRecords)
          .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.serviceRecords.vehicleId))
          .where(and(eq(schema.serviceRecords.id, owner.serviceRecordId), eq(schema.vehicles.householdId, householdId)))
      : await db
          .select({ id: schema.documents.id })
          .from(schema.documents)
          .innerJoin(schema.vehicles, eq(schema.vehicles.id, schema.documents.vehicleId))
          .where(and(eq(schema.documents.id, owner.documentId), eq(schema.vehicles.householdId, householdId)));
  if (!row) throw new NotFoundError("serviceRecordId" in owner ? "Service record" : "Document");
}

/** Throws AttachmentError if any non-empty file is too large or not a real image. Cheap pre-check before writes. */
export async function checkImageFiles(files: File[]) {
  for (const file of files.filter((f) => f.size > 0)) {
    if (file.size > MAX_UPLOAD_BYTES) throw new AttachmentError(`${file.name || "A photo"} is larger than 4 MB.`);
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    if (!sniffImageType(head)) throw new AttachmentError(`${file.name || "A file"} isn't a supported image.`);
  }
}

/** Validates every file (real image type, size), stores them, then records rows. All-or-nothing. */
export async function saveAttachments(householdId: string, owner: AttachmentOwner, files: File[]) {
  const real = files.filter((f) => f.size > 0);
  if (!real.length) return;
  await assertOwnerInHousehold(householdId, owner);

  const existing = await db
    .select({ id: schema.attachments.id })
    .from(schema.attachments)
    .where(
      "serviceRecordId" in owner
        ? eq(schema.attachments.serviceRecordId, owner.serviceRecordId)
        : eq(schema.attachments.documentId, owner.documentId),
    );
  if (existing.length + real.length > MAX_ATTACHMENTS_PER_OWNER) {
    throw new AttachmentError(`You can attach up to ${MAX_ATTACHMENTS_PER_OWNER} photos.`);
  }

  const prepared = [];
  for (const file of real) {
    if (file.size > MAX_UPLOAD_BYTES) throw new AttachmentError(`${file.name || "A photo"} is larger than 4 MB.`);
    const body = Buffer.from(await file.arrayBuffer());
    const contentType = sniffImageType(body);
    if (!contentType) throw new AttachmentError(`${file.name || "A file"} isn't a supported image.`);
    const storageKey = `${householdId}/${randomUUID()}.${EXTENSIONS[contentType]}`;
    prepared.push({ body, contentType, storageKey, size: body.length });
  }

  await Promise.all(prepared.map((p) => storage.put(p.storageKey, p.body, p.contentType)));
  try {
    await db.insert(schema.attachments).values(
      prepared.map((p) => ({
        householdId,
        storageKey: p.storageKey,
        contentType: p.contentType,
        size: p.size,
        ...owner,
      })),
    );
  } catch (error) {
    await removeStoredFiles(prepared.map((p) => p.storageKey));
    throw error;
  }
}

export async function getAttachmentForUser(householdId: string, attachmentId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(attachmentId)) return null;
  const [row] = await db
    .select()
    .from(schema.attachments)
    .where(and(eq(schema.attachments.id, attachmentId), eq(schema.attachments.householdId, householdId)));
  return row ?? null;
}

export async function deleteAttachment(householdId: string, attachmentId: string) {
  const att = await getAttachmentForUser(householdId, attachmentId);
  if (!att) throw new NotFoundError("Attachment");
  await db.delete(schema.attachments).where(eq(schema.attachments.id, att.id));
  await removeStoredFiles([att.storageKey]);
}
