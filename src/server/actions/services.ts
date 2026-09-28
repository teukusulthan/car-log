"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { todayInJakarta } from "@/lib/dates";
import { type ActionState, formValues, parseForm } from "@/lib/form";
import { formatKm } from "@/lib/format";
import { checkOdometer } from "@/lib/odometer";
import { serviceFormSchema } from "@/lib/schemas";
import { NotFoundError, requireMembership } from "@/server/access";
import { AttachmentError, checkImageFiles, deleteAttachment, saveAttachments } from "@/server/queries/attachments";
import { createService, deleteService, updateService } from "@/server/queries/services";
import { listReadings } from "@/server/queries/vehicles";

export type ServiceFormState = ActionState & { needsConfirm?: boolean; recordId?: string };

async function validate(formData: FormData, householdId: string, recordId?: string) {
  const parsed = parseForm(serviceFormSchema, formData);
  if (!parsed.success) return { state: parsed.state } as const;
  const data = parsed.data;

  if (data.date > todayInJakarta()) {
    return {
      state: { fieldErrors: { date: "Can't be in the future" }, message: "Please fix the highlighted fields.", values: formValues(formData) },
    } as const;
  }

  if (data.confirm !== "1") {
    // Compare against every other reading (excluding this record's own reading when editing).
    let readings = await listReadings(householdId, data.vehicleId);
    if (recordId) {
      const [own] = await db
        .select({ id: schema.odometerReadings.id })
        .from(schema.odometerReadings)
        .where(eq(schema.odometerReadings.serviceRecordId, recordId));
      readings = readings.filter((r) => r.id !== own?.id);
    }
    const check = checkOdometer(readings, data.date, data.odometer);
    if (check !== "ok") {
      const message =
        check === "lower_than_before"
          ? `${formatKm(data.odometer)} is lower than an earlier reading for this car. Save anyway?`
          : `${formatKm(data.odometer)} is higher than a later reading for this car. Save anyway?`;
      return { state: { needsConfirm: true, message, values: formValues(formData) } } as const;
    }
  }
  return { data } as const;
}

export async function saveServiceAction(
  recordId: string | null,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const { user, householdId } = await requireMembership();
  const result = await validate(formData, householdId, recordId ?? undefined);
  if (!("data" in result) || !result.data) return result.state;
  const input = { ...result.data };
  delete input.confirm;
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);

  let saved = false;
  try {
    await checkImageFiles(photos);
    if (recordId) {
      await updateService(householdId, recordId, input);
    } else {
      recordId = await createService(householdId, user.id, input);
    }
    saved = true;
    await saveAttachments(householdId, { serviceRecordId: recordId }, photos);
  } catch (e) {
    if (e instanceof NotFoundError) return { message: "This record or car no longer exists.", values: formValues(formData) };
    if (e instanceof AttachmentError) {
      // Pre-check passed but storing failed validation (e.g. photo limit): the service itself is saved.
      if (saved && recordId) {
        revalidatePath("/", "layout");
        return { ok: true, recordId, message: `Service saved, but photos weren't added: ${e.message}` };
      }
      return { message: e.message, values: formValues(formData) };
    }
    throw e;
  }

  revalidatePath("/", "layout");
  return { ok: true, recordId, message: "Service saved" };
}

export async function deleteServiceAction(recordId: string): Promise<{ ok: boolean }> {
  const { householdId } = await requireMembership();
  const keys = await deleteService(householdId, recordId);
  const { removeStoredFiles } = await import("@/server/storage");
  await removeStoredFiles(keys);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAttachmentAction(attachmentId: string): Promise<{ ok: boolean }> {
  const { householdId } = await requireMembership();
  try {
    await deleteAttachment(householdId, attachmentId);
  } catch (e) {
    if (e instanceof NotFoundError) return { ok: false };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
