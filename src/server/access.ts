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

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) return null;
  return { id: user.id, email: user.email, name: user.name ?? null };
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
export async function getCurrentVehicleId(householdId: string): Promise<string | null> {
  const jar = await cookies();
  const wanted = jar.get(VEHICLE_COOKIE)?.value;
  if (wanted && /^[0-9a-f-]{36}$/i.test(wanted)) {
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
