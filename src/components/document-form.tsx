"use client";

import { BellRingIcon, FileTextIcon, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExistingPhotos } from "@/components/existing-photos";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { FormSection } from "@/components/form-section";
import { StickyActions } from "@/components/sticky-actions";
import { PhotoPicker } from "@/components/photo-picker";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentType } from "@/db/schema";
import { DOCUMENT_PRESETS } from "@/lib/document-types";
import { type DocumentFormState, saveDocumentAction } from "@/server/actions/documents";

type Defaults = {
  vehicleId: string;
  type: DocumentType;
  title: string;
  expiresOn: string;
  remindDaysBefore: number;
  notes: string | null;
  photos?: { id: string }[];
};

const REMIND_OPTIONS = [7, 14, 30, 60, 90];

export function DocumentForm({
  documentId,
  vehicles,
  defaults,
}: {
  documentId: string | null;
  vehicles: { id: string; name: string }[];
  defaults: Defaults;
}) {
  const router = useRouter();
  const [state, action] = useActionState<DocumentFormState, FormData>(saveDocumentAction.bind(null, documentId), {});
  const [type, setType] = useState<DocumentType>(defaults.type);
  const [savedPhotos, setSavedPhotos] = useState(defaults.photos?.length ?? 0);
  const titleRef = useRef<HTMLInputElement>(null);
  const remindRef = useRef<HTMLSelectElement>(null);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  useEffect(() => {
    if (!state.ok) return;
    toast.success(state.message ?? "Saved");
    router.push(documentId ? `/documents/${documentId}` : "/documents");
    if (documentId) router.refresh();
  }, [state, router, documentId]);

  const onTypeChange = (next: DocumentType) => {
    const prev = DOCUMENT_PRESETS[type];
    const preset = DOCUMENT_PRESETS[next];
    // Only replace the title/reminder if the user hadn't customised them.
    if (titleRef.current && (!titleRef.current.value || titleRef.current.value === prev.title)) titleRef.current.value = preset.title;
    if (remindRef.current && Number(remindRef.current.value) === prev.remindDaysBefore) {
      remindRef.current.value = String(preset.remindDaysBefore);
    }
    setType(next);
  };

  const remindDefault = Number(v.remindDaysBefore ?? defaults.remindDaysBefore);
  const remindOptions = REMIND_OPTIONS.includes(remindDefault) ? REMIND_OPTIONS : [...REMIND_OPTIONS, remindDefault].sort((a, b) => a - b);

  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <FormSection title="Document" icon={FileTextIcon} index={0}>
        {vehicles.length > 1 ? (
          <FormField id="vehicleId" label="Car">
            <NativeSelect id="vehicleId" name="vehicleId" defaultValue={v.vehicleId ?? defaults.vehicleId}>
              {vehicles.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        ) : (
          <input type="hidden" name="vehicleId" value={defaults.vehicleId} />
        )}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
          {Object.entries(DOCUMENT_PRESETS).map(([value, p]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => onTypeChange(value as DocumentType)}
              className={
                "pressable h-10 rounded-full px-4 text-sm font-medium transition-colors " +
                (type === value ? "bg-foreground text-background" : "bg-muted text-foreground")
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="type" value={type} />
        <FormField id="title" label="Name" error={e.title}>
          <Input {...fieldAria("title", e.title)} ref={titleRef} defaultValue={v.title ?? defaults.title} placeholder="e.g. KIR inspection" required />
        </FormField>
      </FormSection>
      <FormSection title="Expiry & reminder" icon={BellRingIcon} index={1}>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="expiresOn" label="Expires on" error={e.expiresOn}>
            <Input {...fieldAria("expiresOn", e.expiresOn)} type="date" defaultValue={v.expiresOn ?? defaults.expiresOn} required />
          </FormField>
          <FormField id="remindDaysBefore" label="Remind me before" error={e.remindDaysBefore}>
            <NativeSelect id="remindDaysBefore" name="remindDaysBefore" ref={remindRef} defaultValue={remindDefault}>
              {remindOptions.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
      </FormSection>
      <FormSection title="Photos & notes" icon={ImageIcon} index={2}>
        <div className="grid gap-2">
          <PhotoPicker name="photos" label="Photos (policy, STNK…)" existingCount={savedPhotos} />
          {defaults.photos && <ExistingPhotos photos={defaults.photos} onCountChange={setSavedPhotos} />}
        </div>
        <FormField id="notes" label="Notes" error={e.notes}>
          <Textarea {...fieldAria("notes", e.notes)} rows={3} placeholder="Policy number, agent contact…" defaultValue={v.notes ?? defaults.notes ?? ""} />
        </FormField>
      </FormSection>
      {documentId ? (
        <SubmitButton size="lg" className="rounded-2xl" pendingText="Saving…">
          Save changes
        </SubmitButton>
      ) : (
        <StickyActions>
          <SubmitButton size="lg" className="w-full rounded-2xl" pendingText="Saving…">
            Add document
          </SubmitButton>
        </StickyActions>
      )}
    </form>
  );
}
