"use server";

import { revalidatePath } from "next/cache";
import { type ActionState, parseForm } from "@/lib/form";
import { documentFormSchema, renewSchema } from "@/lib/schemas";
import { NotFoundError, requireMembership } from "@/server/access";
import { AttachmentError, checkImageFiles, saveAttachments } from "@/server/queries/attachments";
import { createDocument, deleteDocument, renewDocument, updateDocument } from "@/server/queries/documents";
import { removeStoredFiles } from "@/server/storage";

export type DocumentFormState = ActionState & { documentId?: string };

export async function saveDocumentAction(
  documentId: string | null,
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const { householdId } = await requireMembership();
  const parsed = parseForm(documentFormSchema, formData);
  if (!parsed.success) return parsed.state;
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File);

  let saved = false;
  try {
    await checkImageFiles(photos);
    if (documentId) await updateDocument(householdId, documentId, parsed.data);
    else documentId = await createDocument(householdId, parsed.data);
    saved = true;
    await saveAttachments(householdId, { documentId }, photos);
  } catch (e) {
    if (e instanceof NotFoundError) return { message: "This document or car no longer exists." };
    if (e instanceof AttachmentError) {
      if (saved) {
        revalidatePath("/", "layout");
        return { ok: true, documentId: documentId!, message: `Saved, but photos weren't added: ${e.message}` };
      }
      return { message: e.message };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, documentId, message: "Document saved" };
}

export async function renewDocumentAction(documentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { householdId } = await requireMembership();
  const parsed = parseForm(renewSchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    await renewDocument(householdId, documentId, parsed.data.expiresOn);
  } catch (e) {
    if (e instanceof NotFoundError) return { message: "This document no longer exists." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Renewal saved" };
}

export async function deleteDocumentAction(documentId: string): Promise<{ ok: boolean }> {
  const { householdId } = await requireMembership();
  const keys = await deleteDocument(householdId, documentId);
  await removeStoredFiles(keys);
  revalidatePath("/", "layout");
  return { ok: true };
}
