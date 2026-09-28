"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import { type ActionState, parseForm } from "@/lib/form";
import { getMembership, requireMembership, requireUser } from "@/server/access";
import {
  acceptInvite,
  createHousehold,
  createInvite,
  removeMember,
  renameHousehold,
} from "@/server/queries/households";

const onboardingSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us what to call you").max(60),
  householdName: z.string().trim().min(1, "Give your garage a name").max(60),
});

export async function createHouseholdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = parseForm(onboardingSchema, formData);
  if (!parsed.success) return parsed.state;
  if (!(await getMembership(user.id))) {
    await db.update(schema.users).set({ name: parsed.data.displayName }).where(eq(schema.users.id, user.id));
    await createHousehold(user.id, parsed.data.householdName);
  }
  redirect("/vehicles/new?first=1");
}

const INVITE_ERRORS = {
  invalid: "This invite link isn't valid. Ask for a new one.",
  expired: "This invite link has expired. Ask for a new one.",
  used: "This invite link has already been used. Ask for a new one.",
  already_member: "You're already part of a household, so you can't join another one.",
} as const;

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  const result = await acceptInvite(token, user.id);
  if (!result.ok) return { message: INVITE_ERRORS[result.reason] };
  if (displayName) {
    await db.update(schema.users).set({ name: displayName }).where(eq(schema.users.id, user.id));
  }
  redirect("/");
}

export async function createInviteAction(): Promise<{ token: string } | { error: string }> {
  const { user, householdId } = await requireMembership();
  const { token } = await createInvite(householdId, user.id);
  return { token };
}

export async function removeMemberAction(userId: string): Promise<{ error?: string }> {
  const { householdId, role } = await requireMembership();
  try {
    await removeMember(householdId, role, userId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Couldn't remove member" };
  }
  revalidatePath("/settings");
  return {};
}

const renameSchema = z.object({ householdName: z.string().trim().min(1, "Name can't be empty").max(60) });

export async function renameHouseholdAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { householdId } = await requireMembership();
  const parsed = parseForm(renameSchema, formData);
  if (!parsed.success) return parsed.state;
  await renameHousehold(householdId, parsed.data.householdName);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved" };
}
