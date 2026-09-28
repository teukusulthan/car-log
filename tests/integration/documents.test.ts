import { describe, expect, it } from "vitest";
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  renewDocument,
  updateDocument,
} from "@/server/queries/documents";
import { makeHousehold } from "./factories";

const TODAY = "2026-09-20";
const doc = (vehicleId: string, overrides = {}) => ({
  vehicleId,
  type: "insurance" as const,
  title: "Car insurance",
  expiresOn: "2026-10-01",
  remindDaysBefore: 30,
  notes: null,
  ...overrides,
});

describe("documents", () => {
  it("lists documents soonest-expiring first with renewal status", async () => {
    const h = await makeHousehold();
    await createDocument(h.householdId, doc(h.vehicleId, { title: "STNK", type: "stnk_annual", expiresOn: "2027-05-01" }));
    await createDocument(h.householdId, doc(h.vehicleId));
    const list = await listDocuments(h.householdId, TODAY, h.vehicleId);
    expect(list.map((d) => d.title)).toEqual(["Car insurance", "STNK"]);
    expect(list[0].renewal).toEqual({ status: "due_soon", daysLeft: 11 });
    expect(list[1].renewal.status).toBe("ok");
    expect(list[0].vehicleName).toBe("Avanza");
  });

  it("renewing moves the expiry forward and clears the warning", async () => {
    const h = await makeHousehold();
    const id = await createDocument(h.householdId, doc(h.vehicleId));
    await renewDocument(h.householdId, id, "2027-10-01");
    const [d] = await listDocuments(h.householdId, TODAY, h.vehicleId);
    expect(d.expiresOn).toBe("2027-10-01");
    expect(d.renewal.status).toBe("ok");
  });

  it("updates and deletes", async () => {
    const h = await makeHousehold();
    const id = await createDocument(h.householdId, doc(h.vehicleId));
    await updateDocument(h.householdId, id, doc(h.vehicleId, { title: "Asuransi All Risk" }));
    expect((await getDocument(h.householdId, id))?.title).toBe("Asuransi All Risk");
    await deleteDocument(h.householdId, id);
    expect(await getDocument(h.householdId, id)).toBeNull();
  });

  it("is isolated between households", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const id = await createDocument(a.householdId, doc(a.vehicleId));
    expect(await getDocument(b.householdId, id)).toBeNull();
    expect(await listDocuments(b.householdId, TODAY)).toEqual([]);
    await expect(createDocument(b.householdId, doc(a.vehicleId))).rejects.toThrow(/not found/);
    await expect(updateDocument(b.householdId, id, doc(b.vehicleId))).rejects.toThrow(/not found/);
    await expect(renewDocument(b.householdId, id, "2030-01-01")).rejects.toThrow(/not found/);
    await expect(deleteDocument(b.householdId, id)).rejects.toThrow(/not found/);
  });

  it("can move a document to another car in the same household only", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const id = await createDocument(a.householdId, doc(a.vehicleId));
    await expect(updateDocument(a.householdId, id, doc(b.vehicleId))).rejects.toThrow(/not found/);
  });
});
