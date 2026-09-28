"use client";

import { BellIcon, BellOffIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePush } from "@/lib/use-push";
import { sendTestPushAction } from "@/server/actions/push";

const MESSAGES = {
  loading: "Checking this device…",
  unsupported: "This browser doesn't support notifications.",
  "needs-install": "Add car-log to your Home Screen first — iPhone only allows notifications for installed apps.",
  denied: "Notifications are blocked. Turn them on in iOS Settings → Notifications → car-log.",
  off: "Get a reminder the morning a service or renewal is coming up.",
  on: "Reminders are on for this device.",
} as const;

/** Per-device notification switch for the Settings screen. */
export function NotificationSettings() {
  const { state, endpoint, enable, disable } = usePush();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<string | null | void>) =>
    startTransition(async () => {
      try {
        const error = await fn();
        if (error) toast.error(error);
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">{MESSAGES[state]}</p>
      {state === "off" && (
        <Button onClick={() => run(enable)} disabled={pending}>
          <BellIcon /> Turn on reminders
        </Button>
      )}
      {state === "on" && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await sendTestPushAction(endpoint!);
                if (res.ok) toast.success("Test notification sent");
                return res.error;
              })
            }
          >
            Send a test
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => run(disable)}>
            <BellOffIcon /> Turn off
          </Button>
        </div>
      )}
    </div>
  );
}
