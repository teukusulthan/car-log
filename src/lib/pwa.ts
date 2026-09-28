"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

export function isIOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Client-only environment facts, safe to use during hydration (server snapshot = "unknown"). */
export function usePwaEnvironment() {
  const ios = useSyncExternalStore(noop, isIOS, () => false);
  const standalone = useSyncExternalStore(noop, isStandalone, () => true);
  return { ios, standalone };
}
