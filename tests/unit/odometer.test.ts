import { describe, expect, it } from "vitest";
import { averageDailyKm, checkOdometer, latestReading } from "@/lib/odometer";

describe("latestReading", () => {
  it("picks the most recent date even when an older reading has more km", () => {
    const r = latestReading([
      { km: 9000, date: "2026-09-01" },
      { km: 12000, date: "2025-01-01" },
    ]);
    expect(r).toEqual({ km: 9000, date: "2026-09-01" });
  });
  it("breaks same-day ties with the reading entered last, so typos can be corrected", () => {
    expect(
      latestReading([
        { km: 500000, date: "2026-09-01", enteredAt: 1 },
        { km: 50100, date: "2026-09-01", enteredAt: 2 },
      ])?.km,
    ).toBe(50100);
  });
  it("returns null with no readings", () => {
    expect(latestReading([])).toBeNull();
  });
});

describe("averageDailyKm", () => {
  it("divides distance by days between first and last reading", () => {
    const avg = averageDailyKm(
      [
        { km: 0, date: "2026-09-01" },
        { km: 700, date: "2026-09-15" },
      ],
      "2026-09-20",
    );
    expect(avg).toBe(50);
  });
  it("needs at least two readings", () => {
    expect(averageDailyKm([{ km: 10, date: "2026-09-01" }], "2026-09-20")).toBeNull();
  });
  it("needs a span of at least 7 days", () => {
    expect(
      averageDailyKm(
        [
          { km: 0, date: "2026-09-01" },
          { km: 300, date: "2026-09-04" },
        ],
        "2026-09-20",
      ),
    ).toBeNull();
  });
  it("ignores readings older than 180 days", () => {
    const avg = averageDailyKm(
      [
        { km: 0, date: "2025-01-01" },
        { km: 10000, date: "2026-08-01" },
        { km: 10310, date: "2026-08-11" },
      ],
      "2026-09-20",
    );
    expect(avg).toBe(31);
  });
});

describe("checkOdometer", () => {
  const readings = [
    { km: 5000, date: "2026-06-01" },
    { km: 8000, date: "2026-09-01" },
  ];
  it("accepts a value consistent with history", () => {
    expect(checkOdometer(readings, "2026-09-20", 8100)).toBe("ok");
    expect(checkOdometer(readings, "2026-07-01", 6000)).toBe("ok");
  });
  it("flags a value lower than an earlier reading", () => {
    expect(checkOdometer(readings, "2026-09-20", 7900)).toBe("lower_than_before");
  });
  it("flags a back-dated value higher than a later reading", () => {
    expect(checkOdometer(readings, "2026-07-01", 8500)).toBe("higher_than_after");
  });
});
