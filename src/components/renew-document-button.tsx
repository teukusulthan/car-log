"use client";

import { RefreshCwIcon } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField, fieldAria } from "@/components/form-field";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ActionState } from "@/lib/form";
import { renewDocumentAction } from "@/server/actions/documents";

export function RenewDocumentButton({ documentId, suggested }: { documentId: string; suggested: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="rounded-2xl">
          <RefreshCwIcon /> I renewed it
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[28px] pb-safe">
        <SheetHeader>
          <SheetTitle>Renewed</SheetTitle>
          <SheetDescription>When does the new one expire?</SheetDescription>
        </SheetHeader>
        {open && <RenewForm documentId={documentId} suggested={suggested} onDone={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function RenewForm({ documentId, suggested, onDone }: { documentId: string; suggested: string; onDone: () => void }) {
  const [state, action] = useActionState<ActionState, FormData>(renewDocumentAction.bind(null, documentId), {});
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);
  const error = state.fieldErrors?.expiresOn;
  return (
    <form action={action} className="grid gap-4 px-4 pb-4">
      <FormMessage state={state.fieldErrors ? {} : state} />
      <FormField id="expiresOn" label="New expiry date" error={error}>
        <Input {...fieldAria("expiresOn", error)} type="date" defaultValue={suggested} required />
      </FormField>
      <SubmitButton size="lg" pendingText="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}
