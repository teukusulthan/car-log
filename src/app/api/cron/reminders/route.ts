import { timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { pushConfigured, webPushSender } from "@/server/push";
import { runReminders } from "@/server/queries/reminders";

export const maxDuration = 60;

function authorized(req: Request) {
  if (!env.CRON_SECRET) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called daily by Vercel Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!pushConfigured()) return Response.json({ error: "VAPID keys are not configured" }, { status: 500 });
  const result = await runReminders(new Date(), webPushSender);
  console.info("[cron] reminders", result);
  return Response.json(result);
}
