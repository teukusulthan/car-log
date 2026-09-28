"use client";

import { PlusSquareIcon, ShareIcon, SmartphoneIcon, XIcon } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { usePwaEnvironment } from "@/lib/pwa";

const DISMISS_KEY = "cl-install-guide-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shown in Safari on iPhone: installing to the Home Screen is what enables notifications and keeps data safe. */
export function InstallGuide() {
  const { ios, standalone } = usePwaEnvironment();
  const storedDismissed = useSyncExternalStore(() => () => {}, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  if (!ios || standalone || storedDismissed || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <section aria-labelledby="install-heading" className="relative rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <Button variant="ghost" size="icon-sm" className="absolute top-2 right-2" aria-label="Hide install guide" onClick={dismiss}>
        <XIcon />
      </Button>
      <div className="flex items-center gap-2 pr-8">
        <SmartphoneIcon className="size-5 text-primary" aria-hidden />
        <h2 id="install-heading" className="font-semibold">
          Install car-log on your iPhone
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Needed for reminders — Safari only allows notifications for installed apps.</p>
      <ol className="mt-3 grid gap-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">1</span>
          Tap <ShareIcon className="size-4 text-primary" aria-label="Share" /> in Safari&apos;s toolbar
        </li>
        <li className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</span>
          Choose <span className="inline-flex items-center gap-1 font-medium">Add to Home Screen <PlusSquareIcon className="size-4" aria-hidden /></span>
        </li>
        <li className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">3</span>
          Open car-log from your Home Screen and sign in once
        </li>
      </ol>
    </section>
  );
}
