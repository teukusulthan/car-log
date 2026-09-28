"use client";

import { WifiOffIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Thin banner while the device is offline; pages still show their last saved copy. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-foreground px-4 pt-[max(env(safe-area-inset-top),0.375rem)] pb-1.5 text-sm text-background">
      <WifiOffIcon className="size-4" aria-hidden /> Offline — showing saved data. Changes need a connection.
    </div>
  );
}
