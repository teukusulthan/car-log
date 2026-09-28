import "server-only";
import webpush from "web-push";
import { env } from "@/env";
import type { PushSender } from "@/server/queries/reminders";

let configured = false;

export function pushConfigured() {
  return Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

/** Delivers one payload with Web Push (VAPID). 404/410 from the push service means the subscription is gone. */
export const webPushSender: PushSender = async (sub, payload) => {
  if (!pushConfigured()) throw new Error("VAPID keys are not configured");
  if (!configured) {
    webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
      TTL: 60 * 60 * 24,
      urgency: "normal",
    });
    return { ok: true };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    console.error("[push] delivery failed", status, (error as Error).message);
    return { ok: false, gone: false };
  }
};
