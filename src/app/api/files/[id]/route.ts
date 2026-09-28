import { getSessionUser } from "@/server/access";
import { getMembership } from "@/server/access-core";
import { getAttachmentForUser } from "@/server/queries/attachments";
import { storage } from "@/server/storage";

/** Serves a household's private photo: redirect to a short-lived signed R2 URL, or stream it in local dev. */
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const user = await getSessionUser();
  const membership = user && (await getMembership(user.id));
  if (!membership) return new Response("Not found", { status: 404 });

  const attachment = await getAttachmentForUser(membership.householdId, id);
  if (!attachment) return new Response("Not found", { status: 404 });

  const signed = await storage.signedUrl(attachment.storageKey);
  if (signed) {
    return new Response(null, { status: 302, headers: { Location: signed, "Cache-Control": "private, max-age=240" } });
  }
  const body = await storage.read(attachment.storageKey);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": attachment.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
