import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { describe, expect, it } from "vitest";
import { db, schema } from "@/db";
import { MAX_CODE_ATTEMPTS, TooManyCodeRequestsError, hardenAdapter } from "@/server/verification-tokens";

const adapter = () =>
  hardenAdapter(
    DrizzleAdapter(db, {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    }),
  );

const inTen = () => new Date(Date.now() + 10 * 60_000);
const identifier = "victim@example.com";

describe("hardened verification tokens", () => {
  it("only the newest code is valid", async () => {
    const a = adapter();
    await a.createVerificationToken!({ identifier, token: "old", expires: inTen() }, { now: new Date(Date.now() - 60_000) });
    await a.createVerificationToken!({ identifier, token: "new", expires: inTen() });
    expect(await a.useVerificationToken!({ identifier, token: "old" })).toBeNull();
    expect(await a.useVerificationToken!({ identifier, token: "new" })).toMatchObject({ identifier });
  });

  it("refuses a new code within 30 seconds of the last one, from any entry point", async () => {
    const a = adapter();
    await a.createVerificationToken!({ identifier, token: "one", expires: inTen() });
    await expect(a.createVerificationToken!({ identifier, token: "two", expires: inTen() })).rejects.toBeInstanceOf(
      TooManyCodeRequestsError,
    );
  });

  it(`burns the code after ${MAX_CODE_ATTEMPTS} wrong guesses`, async () => {
    const a = adapter();
    await a.createVerificationToken!({ identifier, token: "right", expires: inTen() });
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i++) {
      expect(await a.useVerificationToken!({ identifier, token: `wrong${i}` })).toBeNull();
    }
    expect(await a.useVerificationToken!({ identifier, token: "right" })).toBeNull();
  });

  it("a few wrong guesses don't block the right code", async () => {
    const a = adapter();
    await a.createVerificationToken!({ identifier, token: "right", expires: inTen() });
    await a.useVerificationToken!({ identifier, token: "nope" });
    expect(await a.useVerificationToken!({ identifier, token: "right" })).toMatchObject({ identifier });
  });
});
