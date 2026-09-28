import { describe, expect, it } from "vitest";
import {
  createService,
  deleteService,
  getService,
  listWorkshops,
  updateService,
  type ServiceInput,
} from "@/server/queries/services";
import { createVehicle, getVehicleStatus } from "@/server/queries/vehicles";
import { makeHousehold } from "./factories";

const TODAY = "2026-09-20";

async function setup() {
  const h = await makeHousehold();
  const vehicleId = await createVehicle(h.householdId, h.userId, {
    name: "Car",
    make: "Toyota",
    model: "Veloz",
    trackedSince: "2026-01-01",
    odometer: 1000,
  });
  const status = (await getVehicleStatus(h.householdId, vehicleId, TODAY))!;
  const oil = status.items.find((i) => i.name === "Engine oil")!;
  const filter = status.items.find((i) => i.name === "Oil filter")!;
  return { ...h, vehicleId, oil, filter };
}

function service(vehicleId: string, overrides: Partial<ServiceInput> = {}): ServiceInput {
  return {
    vehicleId,
    date: "2026-09-10",
    odometer: 10500,
    workshop: "Auto2000 Sunter",
    notes: null,
    totalCost: 650000,
    items: [],
    ...overrides,
  };
}

async function itemStatus(householdId: string, vehicleId: string, itemId: string) {
  const s = (await getVehicleStatus(householdId, vehicleId, TODAY))!;
  return { item: s.items.find((i) => i.id === itemId)!, currentKm: s.currentKm };
}

describe("createService", () => {
  it("resets the due point of each serviced item and records the odometer", async () => {
    const { householdId, userId, vehicleId, oil } = await setup();
    expect((await itemStatus(householdId, vehicleId, oil.id)).item.due.status).toBe("overdue");

    await createService(householdId, userId, service(vehicleId, {
      items: [{ maintenanceItemId: oil.id, label: "Engine oil", cost: 450000 }],
    }));

    const { item, currentKm } = await itemStatus(householdId, vehicleId, oil.id);
    expect(item.last).toEqual({ date: "2026-09-10", km: 10500 });
    expect(item.due.dueKm).toBe(20500);
    expect(item.due.status).toBe("ok");
    expect(currentKm).toBe(10500);
  });

  it("does not lower the current odometer when back-dating an old service", async () => {
    const { householdId, userId, vehicleId, oil } = await setup();
    await createService(householdId, userId, service(vehicleId, { date: "2026-09-15", odometer: 12000 }));
    await createService(householdId, userId, service(vehicleId, {
      date: "2026-02-01",
      odometer: 3000,
      items: [{ maintenanceItemId: oil.id, label: "Engine oil" }],
    }));
    const { item, currentKm } = await itemStatus(householdId, vehicleId, oil.id);
    expect(currentKm).toBe(12000);
    expect(item.last).toEqual({ date: "2026-02-01", km: 3000 });
  });

  it("rejects a vehicle from another household", async () => {
    const a = await setup();
    const b = await makeHousehold();
    await expect(createService(b.householdId, b.userId, service(a.vehicleId))).rejects.toThrow(/not found/);
  });

  it("drops maintenance item links that belong to a different vehicle but keeps the label", async () => {
    const a = await setup();
    const b = await setup();
    const id = await createService(b.householdId, b.userId, service(b.vehicleId, {
      items: [{ maintenanceItemId: a.oil.id, label: "Engine oil" }],
    }));
    const detail = await getService(b.householdId, id);
    expect(detail?.items).toEqual([expect.objectContaining({ label: "Engine oil", maintenanceItemId: null })]);
    expect((await itemStatus(a.householdId, a.vehicleId, a.oil.id)).item.last).toBeNull();
  });
});

describe("deleteService", () => {
  it("falls back to the previous service for the due date", async () => {
    const { householdId, userId, vehicleId, oil } = await setup();
    await createService(householdId, userId, service(vehicleId, {
      date: "2026-04-01", odometer: 5000, items: [{ maintenanceItemId: oil.id, label: "Engine oil" }],
    }));
    const latest = await createService(householdId, userId, service(vehicleId, {
      date: "2026-09-10", odometer: 10500, items: [{ maintenanceItemId: oil.id, label: "Engine oil" }],
    }));
    await deleteService(householdId, latest);
    const { item, currentKm } = await itemStatus(householdId, vehicleId, oil.id);
    expect(item.last).toEqual({ date: "2026-04-01", km: 5000 });
    expect(currentKm).toBe(5000);
  });

  it("cannot delete another household's record", async () => {
    const a = await setup();
    const b = await makeHousehold();
    const id = await createService(a.householdId, a.userId, service(a.vehicleId));
    await expect(deleteService(b.householdId, id)).rejects.toThrow(/not found/);
    expect(await getService(a.householdId, id)).not.toBeNull();
  });
});

describe("updateService", () => {
  it("replaces items and moves the linked odometer reading", async () => {
    const { householdId, userId, vehicleId, oil, filter } = await setup();
    const id = await createService(householdId, userId, service(vehicleId, {
      items: [{ maintenanceItemId: oil.id, label: "Engine oil" }],
    }));
    await updateService(householdId, id, service(vehicleId, {
      odometer: 11000,
      items: [{ maintenanceItemId: filter.id, label: "Oil filter", cost: 80000 }],
    }));
    expect((await itemStatus(householdId, vehicleId, oil.id)).item.last).toBeNull();
    const f = await itemStatus(householdId, vehicleId, filter.id);
    expect(f.item.last).toEqual({ date: "2026-09-10", km: 11000 });
    expect(f.currentKm).toBe(11000);
  });

  it("cannot update another household's record", async () => {
    const a = await setup();
    const b = await makeHousehold();
    const id = await createService(a.householdId, a.userId, service(a.vehicleId));
    await expect(updateService(b.householdId, id, service(b.vehicleId))).rejects.toThrow(/not found/);
  });
});

describe("getService / listWorkshops", () => {
  it("returns the record with its items, and null for other households", async () => {
    const a = await setup();
    const b = await makeHousehold();
    const id = await createService(a.householdId, a.userId, service(a.vehicleId, {
      items: [{ maintenanceItemId: a.oil.id, label: "Engine oil", cost: 450000 }, { label: "Wash", cost: 50000 }],
    }));
    const detail = await getService(a.householdId, id);
    expect(detail).toMatchObject({ id, odometer: 10500, workshop: "Auto2000 Sunter", totalCost: 650000, vehicleName: "Car" });
    expect(detail?.items.map((i) => i.label)).toEqual(["Engine oil", "Wash"]);
    expect(await getService(b.householdId, id)).toBeNull();
  });

  it("lists distinct workshops used by the household, most recent first", async () => {
    const { householdId, userId, vehicleId } = await setup();
    await createService(householdId, userId, service(vehicleId, { date: "2026-03-01", workshop: "Bengkel Jaya" }));
    await createService(householdId, userId, service(vehicleId, { date: "2026-09-01", workshop: "Auto2000 Sunter" }));
    await createService(householdId, userId, service(vehicleId, { date: "2026-05-01", workshop: "Bengkel Jaya" }));
    expect(await listWorkshops(householdId)).toEqual(["Auto2000 Sunter", "Bengkel Jaya"]);
  });
});
