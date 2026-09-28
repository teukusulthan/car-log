import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeEmail } from "@/lib/auth-utils";
import { hashPassword, verifyPassword } from "@/lib/password";

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;
export const MIN_PASSWORD_LENGTH = 8;

export class EmailTakenError extends Error {
  constructor() {
    super("An account with this email already exists.");
    this.name = "EmailTakenError";
  }
}

export type AuthUser = { id: string; email: string; name: string | null };

export async function registerUser(input: { email: string; password: string; name: string }): Promise<AuthUser> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(schema.users)
    .values({ email, name: input.name.trim() || null, passwordHash })
    .onConflictDoNothing({ target: schema.users.email })
    .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name });
  if (!row) throw new EmailTakenError();
  return row;
}

// Used when the email doesn't exist, so unknown emails cost the same time as wrong passwords.
let dummyHash: Promise<string> | null = null;

export type VerifyResult = { ok: true; user: AuthUser } | { ok: false; reason: "invalid" | "locked" };

/** Checks an email/password pair, counting failures and locking the account after too many. */
export async function verifyCredentials(emailInput: string, password: string, now = new Date()): Promise<VerifyResult> {
  let email: string;
  try {
    email = normalizeEmail(emailInput);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) {
    await verifyPassword(password, await (dummyHash ??= hashPassword("not-a-real-password")));
    return { ok: false, reason: "invalid" };
  }
  if (user.lockedUntil && user.lockedUntil > now) return { ok: false, reason: "locked" };

  if (!(await verifyPassword(password, user.passwordHash))) {
    // Count atomically; lock once the limit is reached.
    await db
      .update(schema.users)
      .set({
        failedLogins: sql`${schema.users.failedLogins} + 1`,
        lockedUntil: sql`case when ${schema.users.failedLogins} + 1 >= ${MAX_FAILED_LOGINS}
          then ${new Date(now.getTime() + LOCKOUT_MINUTES * 60_000).toISOString()}::timestamptz else null end`,
      })
      .where(eq(schema.users.id, user.id));
    return { ok: false, reason: "invalid" };
  }

  if (user.failedLogins || user.lockedUntil) {
    await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
  }
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}

export async function changePassword(userId: string, current: string, next: string): Promise<boolean> {
  const [user] = await db.select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, userId));
  if (!user || !(await verifyPassword(current, user.hash))) return false;
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(next), failedLogins: 0, lockedUntil: null })
    .where(eq(schema.users.id, userId));
  return true;
}
