import { describe, expect, it, vi } from "vitest";

// Password hashing is deliberately slow (OWASP scrypt cost); give these tests room.
vi.setConfig({ testTimeout: 30_000 });
import {
  EmailTakenError,
  LOCKOUT_MINUTES,
  MAX_FAILED_LOGINS,
  changePassword,
  registerUser,
  verifyCredentials,
} from "@/server/credentials";

const t0 = new Date("2026-09-29T10:00:00Z");

describe("registerUser", () => {
  it("creates a user with a normalised email and a hashed password", async () => {
    const user = await registerUser({ email: "  Budi@Example.com ", password: "s3cret-pass", name: "Budi" });
    expect(user.email).toBe("budi@example.com");
    expect(await verifyCredentials("budi@example.com", "s3cret-pass")).toMatchObject({ ok: true, user: { id: user.id } });
  });

  it("rejects an email that already has an account", async () => {
    await registerUser({ email: "a@example.com", password: "password1", name: "A" });
    await expect(registerUser({ email: "A@example.com", password: "password2", name: "B" })).rejects.toBeInstanceOf(
      EmailTakenError,
    );
  });
});

describe("verifyCredentials", () => {
  it("fails the same way for an unknown email and a wrong password", async () => {
    await registerUser({ email: "c@example.com", password: "password1", name: "C" });
    expect(await verifyCredentials("nobody@example.com", "password1")).toEqual({ ok: false, reason: "invalid" });
    expect(await verifyCredentials("c@example.com", "wrong-pass")).toEqual({ ok: false, reason: "invalid" });
  });

  it(`locks the account for ${LOCKOUT_MINUTES} minutes after ${MAX_FAILED_LOGINS} wrong passwords`, async () => {
    await registerUser({ email: "d@example.com", password: "password1", name: "D" });
    for (let i = 0; i < MAX_FAILED_LOGINS; i++) await verifyCredentials("d@example.com", "nope", t0);
    expect(await verifyCredentials("d@example.com", "password1", t0)).toEqual({ ok: false, reason: "locked" });
    const later = new Date(t0.getTime() + (LOCKOUT_MINUTES * 60 + 1) * 1000);
    expect(await verifyCredentials("d@example.com", "password1", later)).toMatchObject({ ok: true });
  });

  it("resets the failure count after a successful login", async () => {
    await registerUser({ email: "e@example.com", password: "password1", name: "E" });
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await verifyCredentials("e@example.com", "nope", t0);
    expect(await verifyCredentials("e@example.com", "password1", t0)).toMatchObject({ ok: true });
    for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await verifyCredentials("e@example.com", "nope", t0);
    expect(await verifyCredentials("e@example.com", "password1", t0)).toMatchObject({ ok: true });
  });
});

describe("changePassword", () => {
  it("requires the current password", async () => {
    const user = await registerUser({ email: "f@example.com", password: "password1", name: "F" });
    expect(await changePassword(user.id, "wrong", "new-password")).toBe(false);
    expect(await changePassword(user.id, "password1", "new-password")).toBe(true);
    expect(await verifyCredentials("f@example.com", "new-password")).toMatchObject({ ok: true });
    expect(await verifyCredentials("f@example.com", "password1")).toEqual({ ok: false, reason: "invalid" });
  });
});
