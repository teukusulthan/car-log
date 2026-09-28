"use client";

import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";
import { unsubscribePushAction } from "@/server/actions/push";

/** Stops this device receiving the household's reminders once nobody is signed in on it. */
async function unsubscribeThisDevice() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await unsubscribePushAction(sub.endpoint);
    await sub.unsubscribe();
  } catch {
    // Signing out must never be blocked by push cleanup.
  }
}

/** Stops reminders and clears offline copies of pages on this device, then ends the session. */
export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      className="h-12 w-full rounded-2xl text-destructive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await unsubscribeThisDevice();
          navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_USER_CACHE" });
          await signOutAction();
        })
      }
    >
      <LogOutIcon /> {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
