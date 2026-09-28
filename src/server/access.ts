import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import type { MemberRole } from "@/db/schema";
import { getMembership } from "./access-core";

export { NotFoundError, getMembership } from "./access-core";

export const VEHICLE_COOKIE = "cl_vehicle";

export type SessionUser = { id: string; email: string; name: string | null };
export type Membership = { user: SessionUser; householdId: string; role: MemberRole };

/** The signed-in user, read fresh from the database (a deleted account is signed out immediately). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const [user] = await db
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return user ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed-in user who belongs to a household; otherwise redirects to login or onboarding. */
export const requireMembership = cache(async (): Promise<Membership> => {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");
  return { user, ...membership };
});

/** Resolves the vehicle the user is looking at: cookie if valid for this household, else the first vehicle. */
export async function getCurrentVehicleId(householdId: string, preferred?: string | null): Promise<string | null> {
  const jar = await cookies();
  // An explicit ?vehicle= (e.g. from a notification) wins over the remembered choice.
  for (const wanted of [preferred, jar.get(VEHICLE_COOKIE)?.value]) {
    if (!wanted || !/^[0-9a-f-]{36}$/i.test(wanted)) continue;
    const [hit] = await db
      .select({ id: schema.vehicles.id })
      .from(schema.vehicles)
      .where(and(eq(schema.vehicles.id, wanted), eq(schema.vehicles.householdId, householdId)))
      .limit(1);
    if (hit) return hit.id;
  }
  const [first] = await db
    .select({ id: schema.vehicles.id })
    .from(schema.vehicles)
    .where(eq(schema.vehicles.householdId, householdId))
    .orderBy(asc(schema.vehicles.createdAt))
    .limit(1);
  return first?.id ?? null;
}

export function orNotFound<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) notFound();
  return value;
}

/** Membership plus the vehicle being viewed; sends households without a car to the add-car screen. */
export async function requireCurrentVehicle(preferred?: string | string[] | null) {
  const membership = await requireMembership();
  const vehicleId = await getCurrentVehicleId(membership.householdId, typeof preferred === "string" ? preferred : null);
  if (!vehicleId) redirect("/vehicles/new?first=1");
  return { ...membership, vehicleId };
}
