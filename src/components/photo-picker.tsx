"use client";

import { CameraIcon, Loader2Icon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { MAX_FORM_UPLOAD_BYTES, MAX_UPLOAD_BYTES, compressImage } from "@/lib/image-compress";

type Picked = { file: File; url: string };
export const MAX_PHOTOS = 6;

/** Lets the user add photos (camera or library); compressed files are submitted with the surrounding form. */
export function PhotoPicker({ name, label, existingCount = 0 }: { name: string; label: string; existingCount?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, setBusy] = useState(false);

  // Mirror the picked files into the (hidden) file input so they're part of the form submission.
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    picked.forEach((p) => dt.items.add(p.file));
    inputRef.current.files = dt.files;
  }, [picked]);

  useEffect(() => () => picked.forEach((p) => URL.revokeObjectURL(p.url)), [picked]);

  const onChoose = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const room = MAX_PHOTOS - existingCount - picked.length;
    const chosen = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > chosen.length) toast.error(`You can attach up to ${MAX_PHOTOS} photos.`);
    const next: Picked[] = [];
    let total = picked.reduce((sum, p) => sum + p.file.size, 0);
    for (const f of chosen) {
      const file = await compressImage(f);
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`${f.name} is too large.`);
        continue;
      }
      if (total + file.size > MAX_FORM_UPLOAD_BYTES) {
        toast.error("That's a lot of photo data for one save. Save first, then add the rest by editing.");
        break;
      }
      total += file.size;
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPicked((p) => [...p, ...next]);
    setBusy(false);
  };

  const full = existingCount + picked.length >= MAX_PHOTOS;

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {picked.map((p, i) => (
          <div key={p.url} className="relative size-20 overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={p.url} alt={`New photo ${i + 1}`} className="size-full object-cover" />
            <button
              type="button"
              aria-label={`Remove new photo ${i + 1}`}
              onClick={() => setPicked((all) => all.filter((x) => x !== p))}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground active:bg-muted"
          >
            {busy ? <Loader2Icon className="size-5 animate-spin" /> : <CameraIcon className="size-5" />}
            Add
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const files = e.target.files;
          // The effect above owns this input's file list; read the new selection first, then let it re-sync.
          const copy = files ? Array.from(files) : [];
          const dt = new DataTransfer();
          copy.forEach((f) => dt.items.add(f));
          void onChoose(dt.files);
        }}
      />
    </div>
  );
}
