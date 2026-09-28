"use client";

import { XIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAttachmentAction } from "@/server/actions/services";

/** Stored photos shown in an edit form; each can be removed immediately. */
export function ExistingPhotos({ photos, onCountChange }: { photos: { id: string }[]; onCountChange?: (n: number) => void }) {
  const [visible, setVisible] = useState(photos);
  const [pending, startTransition] = useTransition();
  if (!visible.length) return null;

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteAttachmentAction(id);
      if (!res.ok) return void toast.error("Couldn't delete that photo.");
      const next = visible.filter((p) => p.id !== id);
      setVisible(next);
      onCountChange?.(next.length);
    });

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Saved photos">
      {visible.map((p, i) => (
        <li key={p.id} className="relative size-20 overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- private, access-checked route */}
          <img src={`/api/files/${p.id}`} alt={`Saved photo ${i + 1}`} className="size-full object-cover" />
          <button
            type="button"
            disabled={pending}
            aria-label={`Delete saved photo ${i + 1}`}
            onClick={() => remove(p.id)}
            className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <XIcon className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
