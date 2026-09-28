"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** Thumbnails of stored photos; tapping one opens it full screen. Images load through the access-checked file route. */
export function PhotoGrid({ photos }: { photos: { id: string }[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <ul className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setOpen(p.id)} className="block aspect-square w-full overflow-hidden rounded-xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, signed per request */}
              <img src={`/api/files/${p.id}`} alt={`Photo ${i + 1}`} loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-[calc(100%-1rem)] p-2">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open && (
            // eslint-disable-next-line @next/next/no-img-element -- private, signed per request
            <img src={`/api/files/${open}`} alt="Photo" className="max-h-[80dvh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
