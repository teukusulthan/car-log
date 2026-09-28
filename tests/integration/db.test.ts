import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db, schema } from "@/db";
import { makeHousehold } from "./factories";

describe("database harness", () => {
  it("creates a household with an owner and a vehicle", async () => {
    const { householdId, userId, vehicleId } = await makeHousehold();
    const [member] = await db
      .select()
      .from(schema.householdMembers)
      .where(eq(schema.householdMembers.userId, userId));
    const [vehicle] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, vehicleId));
    expect(member).toMatchObject({ householdId, role: "owner" });
    expect(vehicle.householdId).toBe(householdId);
  });

  it("starts every test from an empty database", async () => {
    expect(await db.select().from(schema.households)).toHaveLength(0);
  });
});
