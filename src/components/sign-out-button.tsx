"use client";

import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/server/actions/auth";

/** Clears this device's offline copies of pages before ending the session. */
export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_USER_CACHE" });
          await signOutAction();
        })
      }
    >
      <LogOutIcon /> {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
