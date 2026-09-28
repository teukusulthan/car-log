import "server-only";
import { and, eq, gt, gte, sql } from "drizzle-orm";
import type { Adapter, VerificationToken } from "next-auth/adapters";
import { db, schema } from "@/db";

/** Wrong guesses allowed per issued code before every live code for that email is deleted. */
export const MAX_CODE_ATTEMPTS = 5;
/** Minimum time between two codes for the same email. */
export const CODE_RESEND_COOLDOWN_MS = 30_000;

export class TooManyCodeRequestsError extends Error {
  constructor() {
    super("A sign-in code was requested moments ago. Please wait before asking for another.");
    this.name = "TooManyCodeRequestsError";
  }
}

const vt = schema.verificationTokens;

export type HardenedAdapter = Omit<Adapter, "createVerificationToken"> & {
  createVerificationToken(token: VerificationToken, opts?: { now?: Date }): Promise<VerificationToken>;
};

/** True if a code for this email was issued within the cooldown. */
export async function codeIssuedRecently(identifier: string, now = new Date()) {
  const [row] = await db
    .select({ token: vt.token })
    .from(vt)
    .where(and(eq(vt.identifier, identifier), gt(vt.createdAt, new Date(now.getTime() - CODE_RESEND_COOLDOWN_MS))))
    .limit(1);
  return Boolean(row);
}

/**
 * Wraps the Auth.js adapter so that, whatever endpoint issues or checks a code:
 * - only the newest code for an email is valid,
 * - codes can't be issued more often than the cooldown (email bombing),
 * - after MAX_CODE_ATTEMPTS wrong guesses all live codes for that email are deleted (brute force).
 */
export function hardenAdapter(adapter: Adapter): HardenedAdapter {
  return {
    ...adapter,
    async createVerificationToken(token: VerificationToken, opts?: { now?: Date }) {
      const now = opts?.now ?? new Date();
      if (await codeIssuedRecently(token.identifier, now)) throw new TooManyCodeRequestsError();
      return db.transaction(async (tx) => {
        await tx.delete(vt).where(eq(vt.identifier, token.identifier));
        const [row] = await tx
          .insert(vt)
          .values({ identifier: token.identifier, token: token.token, expires: token.expires, createdAt: now })
          .returning({ identifier: vt.identifier, token: vt.token, expires: vt.expires });
        return row;
      });
    },
    async useVerificationToken(params) {
      const used = await adapter.useVerificationToken!(params);
      if (used || !params.identifier) return used;
      // Wrong guess: count it against every live code for this email and burn them at the limit.
      await db.update(vt).set({ attempts: sql`${vt.attempts} + 1` }).where(eq(vt.identifier, params.identifier));
      await db.delete(vt).where(and(eq(vt.identifier, params.identifier), gte(vt.attempts, MAX_CODE_ATTEMPTS)));
      return null;
    },
  };
}
