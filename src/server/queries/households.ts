import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { MemberRole } from "@/db/schema";

export const INVITE_TTL_DAYS = 7;

export async function createHousehold(userId: string, name: string): Promise<string> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: schema.householdMembers.householdId })
      .from(schema.householdMembers)
      .where(eq(schema.householdMembers.userId, userId));
    if (existing) throw new Error("User already belongs to a household");
    const [household] = await tx.insert(schema.households).values({ name }).returning({ id: schema.households.id });
    await tx.insert(schema.householdMembers).values({ householdId: household.id, userId, role: "owner" });
    return household.id;
  });
}

export async function getHousehold(householdId: string) {
  const [row] = await db.select().from(schema.households).where(eq(schema.households.id, householdId));
  return row ?? null;
}

export async function renameHousehold(householdId: string, name: string) {
  await db.update(schema.households).set({ name }).where(eq(schema.households.id, householdId));
}

export async function createInvite(householdId: string, userId: string, now = new Date()) {
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(now.getTime() + INVITE_TTL_DAYS * 86_400_000);
  await db.insert(schema.invites).values({ householdId, token, createdBy: userId, expiresAt });
  return { token, expiresAt };
}

export type InviteStatus = "valid" | "expired" | "used";

export async function getInvitePreview(token: string, now = new Date()) {
  const [row] = await db
    .select({
      householdId: schema.invites.householdId,
      householdName: schema.households.name,
      expiresAt: schema.invites.expiresAt,
      usedAt: schema.invites.usedAt,
    })
    .from(schema.invites)
    .innerJoin(schema.households, eq(schema.households.id, schema.invites.householdId))
    .where(eq(schema.invites.token, token));
  if (!row) return null;
  const status: InviteStatus = row.usedAt ? "used" : row.expiresAt <= now ? "expired" : "valid";
  return { householdId: row.householdId, householdName: row.householdName, status };
}

export type AcceptInviteResult =
  | { ok: true; householdId: string }
  | { ok: false; reason: "invalid" | "expired" | "used" | "already_member" };

export async function acceptInvite(token: string, userId: string, now = new Date()): Promise<AcceptInviteResult> {
  return db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(schema.invites)
      .where(eq(schema.invites.token, token))
      .for("update");
    if (!invite) return { ok: false, reason: "invalid" };
    if (invite.usedAt) return { ok: false, reason: "used" };
    if (invite.expiresAt <= now) return { ok: false, reason: "expired" };

    const [membership] = await tx
      .select({ householdId: schema.householdMembers.householdId })
      .from(schema.householdMembers)
      .where(eq(schema.householdMembers.userId, userId));
    if (membership) return { ok: false, reason: "already_member" };

    await tx.insert(schema.householdMembers).values({ householdId: invite.householdId, userId, role: "member" });
    await tx
      .update(schema.invites)
      .set({ usedAt: now, usedBy: userId })
      .where(eq(schema.invites.id, invite.id));
    return { ok: true, householdId: invite.householdId };
  });
}

export async function listMembers(householdId: string) {
  return db
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.householdMembers.role,
    })
    .from(schema.householdMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.householdMembers.userId))
    .where(eq(schema.householdMembers.householdId, householdId))
    .orderBy(asc(schema.householdMembers.createdAt));
}

export async function removeMember(householdId: string, actorRole: MemberRole, userId: string) {
  if (actorRole !== "owner") throw new Error("Only the owner can remove members");
  const [target] = await db
    .select({ role: schema.householdMembers.role })
    .from(schema.householdMembers)
    .where(and(eq(schema.householdMembers.householdId, householdId), eq(schema.householdMembers.userId, userId)));
  if (!target) throw new Error("Member not found");
  if (target.role === "owner") throw new Error("The owner can't be removed");
  await db
    .delete(schema.householdMembers)
    .where(and(eq(schema.householdMembers.householdId, householdId), eq(schema.householdMembers.userId, userId)));
}
