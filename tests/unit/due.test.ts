import { describe, expect, it } from "vitest";
import { compareDue, computeDue } from "@/lib/due";

const ctx = { today: "2026-09-20", currentKm: 19600, avgDailyKm: null };

describe("computeDue", () => {
  it("is overdue when the month interval has passed", () => {
    const r = computeDue(
      { intervalKm: null, intervalMonths: 6, last: { date: "2026-03-01", km: 0 } },
      ctx,
    );
    expect(r.status).toBe("overdue");
    expect(r.dueDate).toBe("2026-09-01");
    expect(r.daysLeft).toBe(-19);
    expect(r.dueKm).toBeNull();
  });

  it("is due soon within 500 km of the km interval", () => {
    const r = computeDue(
      { intervalKm: 10000, intervalMonths: null, last: { date: "2026-08-01", km: 10000 } },
      ctx,
    );
    expect(r.status).toBe("due_soon");
    expect(r.dueKm).toBe(20000);
    expect(r.kmLeft).toBe(400);
  });

  it("uses whichever limit comes first when both are set", () => {
    const r = computeDue(
      { intervalKm: 10000, intervalMonths: 6, last: { date: "2026-03-10", km: 15000 } },
      ctx,
    );
    expect(r.status).toBe("overdue"); // date passed on 09-10, km still 5400 left
    expect(r.kmLeft).toBe(5400);
  });

  it("is due soon within 14 days of the date", () => {
    const r = computeDue(
      { intervalKm: null, intervalMonths: 6, last: { date: "2026-04-01", km: 0 } },
      ctx,
    );
    expect(r.status).toBe("due_soon");
    expect(r.daysLeft).toBe(11);
  });

  it("projects the km due date from average daily km", () => {
    const r = computeDue(
      { intervalKm: 10000, intervalMonths: null, last: { date: "2026-09-01", km: 11600 } },
      { ...ctx, avgDailyKm: 50 },
    );
    expect(r.kmLeft).toBe(2000);
    expect(r.projectedDate).toBe("2026-10-30");
    expect(r.status).toBe("ok");
  });

  it("marks due soon when the projected date is within 14 days", () => {
    const r = computeDue(
      { intervalKm: 10000, intervalMonths: null, last: { date: "2026-09-01", km: 10200 } },
      { ...ctx, avgDailyKm: 100 },
    );
    expect(r.kmLeft).toBe(600);
    expect(r.status).toBe("due_soon");
  });

  it("treats exactly reaching the due km as due soon and passing it as overdue", () => {
    const base = { intervalKm: 10000, intervalMonths: null, last: { date: "2026-08-01", km: 9600 } };
    expect(computeDue(base, ctx).status).toBe("due_soon");
    expect(computeDue(base, { ...ctx, currentKm: 19601 }).status).toBe("overdue");
  });

  it("is ok with nulls when no interval is configured", () => {
    const r = computeDue(
      { intervalKm: null, intervalMonths: null, last: { date: "2026-01-01", km: 0 } },
      ctx,
    );
    expect(r).toEqual({
      status: "ok",
      dueDate: null,
      dueKm: null,
      daysLeft: null,
      kmLeft: null,
      projectedDate: null,
    });
  });
});

describe("compareDue", () => {
  it("orders overdue before due soon before ok, then soonest first", () => {
    const ok = computeDue({ intervalKm: null, intervalMonths: 12, last: { date: "2026-09-01", km: 0 } }, ctx);
    const soon = computeDue({ intervalKm: null, intervalMonths: 6, last: { date: "2026-04-01", km: 0 } }, ctx);
    const late = computeDue({ intervalKm: null, intervalMonths: 6, last: { date: "2026-03-01", km: 0 } }, ctx);
    const later = computeDue({ intervalKm: null, intervalMonths: 1, last: { date: "2026-01-01", km: 0 } }, ctx);
    expect([ok, soon, late, later].sort(compareDue)).toEqual([later, late, soon, ok]);
  });
});
