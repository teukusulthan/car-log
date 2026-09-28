import { describe, expect, it } from "vitest";
import { addDays, addMonths, diffDays, todayInJakarta } from "@/lib/dates";

describe("todayInJakarta", () => {
  it("rolls over to the next day after 17:00 UTC (00:00 WIB)", () => {
    expect(todayInJakarta(new Date("2026-09-28T17:30:00Z"))).toBe("2026-09-29");
  });
  it("stays on the same day just before midnight WIB", () => {
    expect(todayInJakarta(new Date("2026-09-28T16:59:00Z"))).toBe("2026-09-28");
  });
});

describe("addMonths", () => {
  it("clamps to the end of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("respects leap years", () => {
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });
  it("crosses year boundaries", () => {
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
});

describe("addDays / diffDays", () => {
  it("adds days across months", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
  });
  it("returns to - from in days", () => {
    expect(diffDays("2026-09-28", "2026-10-12")).toBe(14);
    expect(diffDays("2026-10-12", "2026-09-28")).toBe(-14);
  });
});
