"use client";

import { useCallback, useEffect, useState } from "react";
import { isIOS, isStandalone } from "@/lib/pwa";
import { subscribePushAction, unsubscribePushAction } from "@/server/actions/push";

export type PushState =
  | "loading"
  | "unsupported" // browser has no Push API
  | "needs-install" // iOS Safari: only installed apps may use push
  | "denied"
  | "off"
  | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  if (!navigator.serviceWorker.controller) await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

/** Asks permission (must run inside a tap on iOS), subscribes, and stores the subscription on the server. */
async function subscribeDevice(): Promise<{ state?: PushState; endpoint?: string; error?: string }> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { error: "Notifications aren't configured yet." };
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied"
      ? { state: "denied", error: "Notifications are blocked. Enable them in iOS Settings → car-log." }
      : { state: "off" };
  }
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const res = await subscribePushAction(sub.toJSON());
  if (!res.ok) return { error: res.error ?? "Couldn't turn on notifications." };
  return { state: "on", endpoint: sub.endpoint };
}

/** Push subscription state for this device, plus enable/disable actions. */
export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: PushState;
      let ep: string | null = null;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        next = isIOS() && !isStandalone() ? "needs-install" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        ep = sub?.endpoint ?? null;
        next = sub ? "on" : "off";
      }
      if (!cancelled) {
        setEndpoint(ep);
        setState(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = useCallback(async (): Promise<string | null> => {
    try {
      const result = await subscribeDevice();
      if (result.state) setState(result.state);
      if (result.endpoint) setEndpoint(result.endpoint);
      return result.error ?? null;
    } catch (error) {
      console.error("Push subscription failed", error);
      return "Couldn't turn on notifications on this device. Please try again.";
    }
  }, []);

  const disable = useCallback(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await unsubscribePushAction(sub.endpoint);
      await sub.unsubscribe();
    }
    setEndpoint(null);
    setState("off");
  }, []);

  return { state, endpoint, enable, disable };
}
