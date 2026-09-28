import { describe, expect, it } from "vitest";
import { renewalStatus } from "@/lib/documents";

describe("renewalStatus", () => {
  it("is due soon inside the reminder window", () => {
    expect(renewalStatus("2026-09-30", 14, "2026-09-20")).toEqual({ status: "due_soon", daysLeft: 10 });
  });
  it("is expired after the expiry date", () => {
    expect(renewalStatus("2026-09-19", 14, "2026-09-20")).toEqual({ status: "expired", daysLeft: -1 });
  });
  it("is still valid on the expiry date itself", () => {
    expect(renewalStatus("2026-09-20", 14, "2026-09-20").status).toBe("due_soon");
  });
  it("is ok outside the window", () => {
    expect(renewalStatus("2026-10-20", 14, "2026-09-20")).toEqual({ status: "ok", daysLeft: 30 });
  });
});
