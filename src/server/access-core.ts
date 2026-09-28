import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/** Framework-free membership lookup (usable from tests and route handlers). */
export async function getMembership(userId: string) {
  const [row] = await db
    .select({ householdId: schema.householdMembers.householdId, role: schema.householdMembers.role })
    .from(schema.householdMembers)
    .where(eq(schema.householdMembers.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Thrown by queries when a record doesn't exist *in this household*. */
export class NotFoundError extends Error {
  constructor(what = "Record") {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
