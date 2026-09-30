"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { isAllowedPushEndpoint } from "@/lib/push-endpoint";
import { requireMembership } from "@/server/access";
import { pushConfigured, webPushSender } from "@/server/push";
import { removeSubscription, saveSubscription } from "@/server/queries/reminders";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000).refine(isAllowedPushEndpoint, "Unsupported push service"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function subscribePushAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireMembership();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid subscription" };
  await saveSubscription(user.id, parsed.data, (await headers()).get("user-agent")?.slice(0, 300));
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string): Promise<{ ok: boolean }> {
  const { user } = await requireMembership();
  await removeSubscription(user.id, endpoint);
  return { ok: true };
}

/** Sends a test notification to this device so the user can confirm reminders work. */
export async function sendTestPushAction(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireMembership();
  if (!pushConfigured()) return { ok: false, error: "Notifications aren't configured on the server." };
  const [sub] = await db
    .select()
    .from(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, user.id), eq(schema.pushSubscriptions.endpoint, endpoint)));
  if (!sub) return { ok: false, error: "This device isn't subscribed." };
  const res = await webPushSender(
    sub,
    JSON.stringify({ title: "car-log reminders are on", body: "You'll get a heads-up before services and renewals are due.", url: "/", tag: "test" }),
  );
  if (!res.ok && res.gone) await removeSubscription(user.id, endpoint);
  return res.ok ? { ok: true } : { ok: false, error: "The push service rejected the notification." };
}
