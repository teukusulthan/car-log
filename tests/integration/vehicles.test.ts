import { describe, expect, it } from "vitest";
import { DEFAULT_SCHEDULE } from "@/lib/maintenance-template";
import {
  addReading,
  deleteReading,
  createVehicle,
  deleteVehicle,
  getVehicle,
  getVehicleStatus,
  listReadings,
  listVehicles,
  saveSchedule,
  updateVehicle,
} from "@/server/queries/vehicles";
import { makeHousehold } from "./factories";

const input = {
  name: "Family car",
  make: "Toyota",
  model: "Avanza",
  year: 2026,
  plate: "B 1234 XYZ",
  trackedSince: "2026-09-01",
  odometer: 5000,
};

describe("createVehicle", () => {
  it("seeds the default maintenance schedule and an initial odometer reading", async () => {
    const { householdId, userId } = await makeHousehold();
    const id = await createVehicle(householdId, userId, input);
    const status = await getVehicleStatus(householdId, id, "2026-09-20");
    expect(status?.items).toHaveLength(DEFAULT_SCHEDULE.length);
    expect(status?.currentKm).toBe(5000);
    expect(status?.lastReadingDate).toBe("2026-09-01");
  });

  it("uses the tracking start as the baseline for never-serviced items", async () => {
    const { householdId, userId } = await makeHousehold();
    const id = await createVehicle(householdId, userId, input);
    const status = await getVehicleStatus(householdId, id, "2026-09-20");
    const oil = status!.items.find((i) => i.name === "Engine oil")!;
    expect(oil.last).toBeNull();
    expect(oil.baseline).toEqual({ date: "2026-09-01", km: 5000 });
    expect(oil.due.dueKm).toBe(15000);
    expect(oil.due.dueDate).toBe("2027-03-01");
  });
});

describe("household isolation", () => {
  it("hides vehicles of other households", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    expect(await getVehicle(b.householdId, a.vehicleId)).toBeNull();
    expect(await getVehicleStatus(b.householdId, a.vehicleId, "2026-09-20")).toBeNull();
    expect((await listVehicles(b.householdId)).map((v) => v.id)).not.toContain(a.vehicleId);
  });

  it("refuses to change or delete another household's vehicle", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    await expect(updateVehicle(b.householdId, a.vehicleId, { ...input, name: "Hacked" })).rejects.toThrow(/not found/);
    await expect(deleteVehicle(b.householdId, a.vehicleId)).rejects.toThrow(/not found/);
    await expect(addReading(b.householdId, a.vehicleId, b.userId, { km: 1, date: "2026-09-20" })).rejects.toThrow(/not found/);
    await expect(saveSchedule(b.householdId, a.vehicleId, [])).rejects.toThrow(/not found/);
    expect((await getVehicle(a.householdId, a.vehicleId))?.name).toBe("Avanza");
  });
});

describe("odometer", () => {
  it("does not let a back-dated reading change the current odometer", async () => {
    const { householdId, userId } = await makeHousehold();
    const id = await createVehicle(householdId, userId, input);
    await addReading(householdId, id, userId, { km: 6000, date: "2026-09-15" });
    await addReading(householdId, id, userId, { km: 9000, date: "2026-08-01" });
    const status = await getVehicleStatus(householdId, id, "2026-09-20");
    expect(status?.currentKm).toBe(6000);
  });

  it("lists readings newest first", async () => {
    const { householdId, userId, vehicleId } = await makeHousehold();
    await addReading(householdId, vehicleId, userId, { km: 2000, date: "2026-02-01" });
    const readings = await listReadings(householdId, vehicleId);
    expect(readings.map((r) => r.km)).toEqual([2000, 1000]);
  });
});

describe("schedule", () => {
  it("updates, adds and removes items, and sorts results by urgency", async () => {
    const { householdId, userId } = await makeHousehold();
    const id = await createVehicle(householdId, userId, input);
    const before = (await getVehicleStatus(householdId, id, "2026-09-20"))!.items;
    const oil = before.find((i) => i.name === "Engine oil")!;
    await saveSchedule(householdId, id, [
      { id: oil.id, name: "Engine oil", intervalKm: 5000, intervalMonths: 3 },
      { name: "Wiper blades", intervalKm: null, intervalMonths: 1 },
    ]);
    const after = (await getVehicleStatus(householdId, id, "2026-10-05"))!.items;
    expect(after.map((i) => i.name)).toEqual(["Wiper blades", "Engine oil"]);
    expect(after[0].due.status).toBe("overdue");
    expect(after[1].intervalKm).toBe(5000);
  });

  it("ignores item ids that belong to another vehicle", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const aCar = await createVehicle(a.householdId, a.userId, input);
    const bCar = await createVehicle(b.householdId, b.userId, input);
    const foreign = (await getVehicleStatus(a.householdId, aCar, "2026-09-20"))!.items[0];
    await saveSchedule(b.householdId, bCar, [{ id: foreign.id, name: "Stolen", intervalKm: 1, intervalMonths: null }]);
    const aItems = (await getVehicleStatus(a.householdId, aCar, "2026-09-20"))!.items;
    expect(aItems.find((i) => i.id === foreign.id)?.name).toBe(foreign.name);
  });
});

describe("updateVehicle / deleteVehicle", () => {
  it("updates details and deletes the vehicle", async () => {
    const { householdId, vehicleId } = await makeHousehold();
    await updateVehicle(householdId, vehicleId, { ...input, name: "Daily" });
    expect((await getVehicle(householdId, vehicleId))?.name).toBe("Daily");
    await deleteVehicle(householdId, vehicleId);
    expect(await getVehicle(householdId, vehicleId)).toBeNull();
  });
});

describe("baseline", () => {
  it("keeps the tracking-start reading as baseline even if older readings are back-entered", async () => {
    const { householdId, userId } = await makeHousehold();
    const id = await createVehicle(householdId, userId, input);
    await addReading(householdId, id, userId, { km: 3000, date: "2026-05-01" });
    const oil = (await getVehicleStatus(householdId, id, "2026-09-20"))!.items.find((i) => i.name === "Engine oil")!;
    expect(oil.baseline).toEqual({ date: "2026-09-01", km: 5000 });
  });
});

describe("odometer corrections", () => {
  it("a same-day correction replaces a typo, and manual readings can be deleted", async () => {
    const { householdId, userId, vehicleId } = await makeHousehold({ odometer: 50000, trackedSince: "2026-09-19" });
    await addReading(householdId, vehicleId, userId, { km: 500000, date: "2026-09-20" });
    await addReading(householdId, vehicleId, userId, { km: 50100, date: "2026-09-20" });
    expect((await getVehicleStatus(householdId, vehicleId, "2026-09-20"))?.currentKm).toBe(50100);

    const typo = (await listReadings(householdId, vehicleId)).find((r) => r.km === 500000)!;
    await deleteReading(householdId, typo.id);
    expect((await listReadings(householdId, vehicleId)).map((r) => r.km)).not.toContain(500000);
  });

  it("won't delete another household's reading, a service's reading, or the last reading", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const [initial] = await listReadings(a.householdId, a.vehicleId);
    await expect(deleteReading(b.householdId, initial.id)).rejects.toThrow(/not found/);
    await expect(deleteReading(a.householdId, initial.id)).rejects.toThrow(/only reading/);
    const { createService } = await import("@/server/queries/services");
    await createService(a.householdId, a.userId, { vehicleId: a.vehicleId, date: "2026-02-01", odometer: 2000, totalCost: 0, items: [{ label: "x" }] });
    const serviceReading = (await listReadings(a.householdId, a.vehicleId)).find((r) => r.km === 2000)!;
    await expect(deleteReading(a.householdId, serviceReading.id)).rejects.toThrow(/service/);
  });
});
