"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Asks the service worker to keep a copy of each screen the user opens, for offline viewing. */
export function OfflinePageCache() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !navigator.onLine) return;
    const url = search ? `${pathname}?${search}` : pathname;
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage({ type: "CACHE_PAGE", url }))
      .catch(() => {});
  }, [pathname, search]);

  return null;
}
