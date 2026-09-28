import { describe, expect, it } from "vitest";
import { costSummary, createService, listServiceYears, listServices } from "@/server/queries/services";
import { makeHousehold } from "./factories";

async function add(h: Awaited<ReturnType<typeof makeHousehold>>, date: string, total: number, items: { label: string; cost?: number }[] = []) {
  return createService(h.householdId, h.userId, {
    vehicleId: h.vehicleId,
    date,
    odometer: 2000,
    totalCost: total,
    items: items.length ? items : [{ label: "Check-up" }],
  });
}

describe("listServices", () => {
  it("lists a vehicle's records newest first with item labels", async () => {
    const h = await makeHousehold();
    await add(h, "2026-03-01", 100000, [{ label: "Wash" }]);
    await add(h, "2026-09-01", 500000, [{ label: "Engine oil" }, { label: "Oil filter" }]);
    const list = await listServices(h.householdId, h.vehicleId);
    expect(list.map((r) => r.date)).toEqual(["2026-09-01", "2026-03-01"]);
    expect(list[0]).toMatchObject({ totalCost: 500000, labels: ["Engine oil", "Oil filter"], photoCount: 0 });
  });

  it("returns nothing for another household's vehicle", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    await add(a, "2026-03-01", 1);
    expect(await listServices(b.householdId, a.vehicleId)).toEqual([]);
  });
});

describe("costSummary", () => {
  it("totals one year by month and by item, putting unitemised cost under 'Other / labour'", async () => {
    const h = await makeHousehold();
    await add(h, "2026-01-15", 600000, [{ label: "Engine oil", cost: 450000 }, { label: "Oil filter", cost: 50000 }]);
    await add(h, "2026-01-20", 200000, [{ label: "Engine oil", cost: 200000 }]);
    await add(h, "2026-07-01", 300000, [{ label: "Tires" }]);
    await add(h, "2025-12-31", 999999);

    const s = await costSummary(h.householdId, h.vehicleId, 2026);
    expect(s.total).toBe(1100000);
    expect(s.byMonth[0]).toBe(800000);
    expect(s.byMonth[6]).toBe(300000);
    expect(s.byMonth.reduce((a, b) => a + b, 0)).toBe(1100000);
    expect(s.byItem).toEqual([
      { label: "Engine oil", total: 650000 },
      { label: "Other / labour", total: 400000 },
      { label: "Oil filter", total: 50000 },
    ]);
    expect(s.serviceCount).toBe(3);
  });

  it("ignores other households", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    await add(a, "2026-01-15", 600000);
    expect((await costSummary(b.householdId, a.vehicleId, 2026)).total).toBe(0);
  });

  it("lists years that have services, newest first", async () => {
    const h = await makeHousehold();
    await add(h, "2024-05-01", 1);
    await add(h, "2026-05-01", 1);
    expect(await listServiceYears(h.householdId, h.vehicleId)).toEqual([2026, 2024]);
  });
});
