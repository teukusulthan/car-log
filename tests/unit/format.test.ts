import { describe, expect, it } from "vitest";
import type { DueResult } from "@/lib/due";
import { describeDue, describeDays, formatDate, formatIDR, formatKm, formatMonth } from "@/lib/format";

const base: DueResult = { status: "ok", dueDate: null, dueKm: null, daysLeft: null, kmLeft: null, projectedDate: null };

describe("number formatting", () => {
  it("formats rupiah with Indonesian grouping", () => {
    expect(formatIDR(1250000)).toBe("Rp 1.250.000");
    expect(formatIDR(0)).toBe("Rp 0");
  });
  it("formats kilometres", () => {
    expect(formatKm(12345)).toBe("12.345 km");
  });
});

describe("date formatting", () => {
  it("formats a calendar date without timezone drift", () => {
    expect(formatDate("2026-09-28")).toBe("28 Sep 2026");
    expect(formatMonth("2026-09-28")).toBe("September 2026");
  });
});

describe("describeDays", () => {
  it("uses natural phrases", () => {
    expect(describeDays(0)).toBe("today");
    expect(describeDays(1)).toBe("tomorrow");
    expect(describeDays(5)).toBe("in 5 days");
    expect(describeDays(21)).toBe("in 3 weeks");
    expect(describeDays(95)).toBe("in 3 months");
    expect(describeDays(400)).toBe("in 13 months");
  });
});

describe("describeDue", () => {
  it("describes km overdue first when the km limit was passed", () => {
    expect(describeDue({ ...base, status: "overdue", kmLeft: -1200, daysLeft: 30 })).toBe("Overdue by 1.200 km");
  });
  it("describes date overdue", () => {
    expect(describeDue({ ...base, status: "overdue", daysLeft: -12 })).toBe("Overdue by 12 days");
    expect(describeDue({ ...base, status: "overdue", daysLeft: -1 })).toBe("Overdue by 1 day");
  });
  it("describes due soon by km when close in km", () => {
    expect(describeDue({ ...base, status: "due_soon", kmLeft: 400, daysLeft: 90 })).toBe("Due in 400 km");
  });
  it("describes due soon by date", () => {
    expect(describeDue({ ...base, status: "due_soon", daysLeft: 1, kmLeft: 3000 })).toBe("Due tomorrow");
    expect(describeDue({ ...base, status: "due_soon", daysLeft: 0 })).toBe("Due today");
  });
  it("describes due soon by projected date", () => {
    expect(
      describeDue({ ...base, status: "due_soon", kmLeft: 600, projectedDate: "2026-09-26" }, "2026-09-20"),
    ).toBe("Due in ~6 days");
  });
  it("describes ok items by both limits", () => {
    expect(describeDue({ ...base, kmLeft: 9600, daysLeft: 150 })).toBe("In 9.600 km or 5 months");
    expect(describeDue({ ...base, daysLeft: 300 })).toBe("In 10 months");
    expect(describeDue({ ...base, kmLeft: 5000 })).toBe("In 5.000 km");
    expect(describeDue(base)).toBe("No schedule");
  });
});

describe("describeAgo", () => {
  it("describes past days", async () => {
    const { describeAgo } = await import("@/lib/format");
    expect(describeAgo(0)).toBe("today");
    expect(describeAgo(1)).toBe("yesterday");
    expect(describeAgo(9)).toBe("9 days ago");
    expect(describeAgo(70)).toBe("2 months ago");
  });
});
