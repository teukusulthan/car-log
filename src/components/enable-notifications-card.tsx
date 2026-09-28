"use client";

import { BellRingIcon, XIcon } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePush } from "@/lib/use-push";

const DISMISS_KEY = "cl-notify-card-dismissed";
const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/** Home-screen nudge to enable reminders, shown only when the device can actually subscribe. */
export function EnableNotificationsCard() {
  const { state, enable } = usePush();
  const stored = useSyncExternalStore(() => () => {}, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();
  if (state !== "off" || stored || dismissed) return null;

  return (
    <section className="relative flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <BellRingIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="grid flex-1 gap-2 pr-6">
        <div>
          <h2 className="font-semibold">Get reminded in time</h2>
          <p className="text-sm text-muted-foreground">A notification the morning something is due — for everyone in your garage.</p>
        </div>
        <Button
          size="sm"
          className="justify-self-start"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const error = await enable();
              if (error) toast.error(error);
              else toast.success("Reminders turned on");
            })
          }
        >
          Turn on reminders
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-2 right-2"
        aria-label="Not now"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {}
          setDismissed(true);
        }}
      >
        <XIcon />
      </Button>
    </section>
  );
}
