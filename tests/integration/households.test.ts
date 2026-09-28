import { describe, expect, it } from "vitest";
import {
  acceptInvite,
  createHousehold,
  createInvite,
  getInvitePreview,
  listMembers,
  removeMember,
} from "@/server/queries/households";
import { getMembership } from "@/server/access-core";
import { makeHousehold, makeUser } from "./factories";

describe("createHousehold", () => {
  it("makes the creator the owner", async () => {
    const user = await makeUser();
    const householdId = await createHousehold(user.id, "Rumah");
    expect(await getMembership(user.id)).toEqual({ householdId, role: "owner" });
  });

  it("refuses a user who already has a household", async () => {
    const { userId } = await makeHousehold();
    await expect(createHousehold(userId, "Second")).rejects.toThrow(/already/);
  });
});

describe("invites", () => {
  it("adds the invited user as a member", async () => {
    const { householdId, userId } = await makeHousehold();
    const { token } = await createInvite(householdId, userId);
    const guest = await makeUser();
    expect(await acceptInvite(token, guest.id)).toEqual({ ok: true, householdId });
    expect(await getMembership(guest.id)).toEqual({ householdId, role: "member" });
  });

  it("cannot be used twice", async () => {
    const { householdId, userId } = await makeHousehold();
    const { token } = await createInvite(householdId, userId);
    await acceptInvite(token, (await makeUser()).id);
    expect(await acceptInvite(token, (await makeUser()).id)).toEqual({ ok: false, reason: "used" });
  });

  it("expires after 7 days", async () => {
    const { householdId, userId } = await makeHousehold();
    const now = new Date("2026-09-01T00:00:00Z");
    const { token, expiresAt } = await createInvite(householdId, userId, now);
    expect(expiresAt.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    const later = new Date("2026-09-08T00:00:01Z");
    expect(await acceptInvite(token, (await makeUser()).id, later)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects unknown tokens", async () => {
    expect(await acceptInvite("nope", (await makeUser()).id)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects users who already belong to a household, without using up the invite", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const { token } = await createInvite(a.householdId, a.userId);
    expect(await acceptInvite(token, b.userId)).toEqual({ ok: false, reason: "already_member" });
    expect(await acceptInvite(token, (await makeUser()).id)).toMatchObject({ ok: true });
  });

  it("previews the household name for the invite page", async () => {
    const { householdId, userId } = await makeHousehold();
    const { token } = await createInvite(householdId, userId);
    expect(await getInvitePreview(token)).toMatchObject({ householdName: "Test garage", status: "valid" });
    expect(await getInvitePreview("missing")).toBeNull();
  });
});

describe("members", () => {
  it("lists only members of the given household", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const members = await listMembers(a.householdId);
    expect(members.map((m) => m.userId)).toEqual([a.userId]);
    expect(members.map((m) => m.userId)).not.toContain(b.userId);
  });

  it("lets the owner remove a member but not themselves", async () => {
    const { householdId, userId } = await makeHousehold();
    const { token } = await createInvite(householdId, userId);
    const guest = await makeUser();
    await acceptInvite(token, guest.id);
    await removeMember(householdId, "owner", guest.id);
    expect(await getMembership(guest.id)).toBeNull();
    await expect(removeMember(householdId, "owner", userId)).rejects.toThrow();
  });

  it("does not let members remove others", async () => {
    const { householdId, userId } = await makeHousehold();
    await expect(removeMember(householdId, "member", userId)).rejects.toThrow();
  });

  it("does not remove users from another household", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    await removeMember(a.householdId, "owner", b.userId).catch(() => {});
    expect(await getMembership(b.userId)).not.toBeNull();
  });
});
