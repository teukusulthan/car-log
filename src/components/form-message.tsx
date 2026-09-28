import { CircleAlertIcon } from "lucide-react";
import type { ActionState } from "@/lib/form";

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message || state.ok) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </div>
  );
}
