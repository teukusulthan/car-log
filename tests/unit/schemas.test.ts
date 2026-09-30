import { afterEach, describe, expect, it, vi } from "vitest";
import { vehicleDetailsSchema } from "@/lib/schemas";

const base = { name: "Car", make: "Toyota", model: "Veloz", plate: "" };

describe("vehicle year", () => {
  afterEach(() => vi.useRealTimers());

  it("allows next year's model, judged at validation time rather than server start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-06-01T00:00:00Z"));
    expect(vehicleDetailsSchema.safeParse({ ...base, year: "2032" }).success).toBe(true);
    expect(vehicleDetailsSchema.safeParse({ ...base, year: "2033" }).success).toBe(false);
  });

  it("allows a blank year", () => {
    expect(vehicleDetailsSchema.parse({ ...base, year: "" }).year).toBeNull();
  });
});
