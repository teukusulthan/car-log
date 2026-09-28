import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isoDate, kmField, moneyField, optionalInt, optionalText } from "@/lib/validators";

describe("kmField", () => {
  const s = kmField("Odometer");
  it("accepts Indonesian thousands separators and spaces", () => {
    expect(s.parse("12.345")).toBe(12345);
    expect(s.parse("12 345 km")).toBe(12345);
  });
  it("rejects empty and absurd values", () => {
    expect(s.safeParse("").success).toBe(false);
    expect(s.safeParse("5000000").success).toBe(false);
  });
});

describe("moneyField", () => {
  it("parses rupiah input and treats blank as 0", () => {
    expect(moneyField.parse("Rp 1.250.000")).toBe(1250000);
    expect(moneyField.parse("")).toBe(0);
  });
});

describe("optionalInt / optionalText", () => {
  it("maps blank to null", () => {
    expect(optionalInt.parse("")).toBeNull();
    expect(optionalInt.parse("10.000")).toBe(10000);
    expect(optionalText(10).parse("  ")).toBeNull();
    expect(optionalText(10).parse(" hi ")).toBe("hi");
  });
});

describe("isoDate", () => {
  it("accepts YYYY-MM-DD only", () => {
    expect(isoDate().parse("2026-09-28")).toBe("2026-09-28");
    expect(z.object({ d: isoDate() }).safeParse({ d: "28/09/2026" }).success).toBe(false);
    expect(isoDate().safeParse("2026-02-30").success).toBe(false);
  });
});
