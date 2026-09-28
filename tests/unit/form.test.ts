import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseForm } from "@/lib/form";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  km: z.coerce.number().int().min(0, "Must be 0 or more"),
});

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("parseForm", () => {
  it("returns parsed data on success", () => {
    const r = parseForm(schema, fd({ name: " Avanza ", km: "1200" }));
    expect(r).toEqual({ success: true, data: { name: "Avanza", km: 1200 } });
  });

  it("returns field errors and echoes submitted values on failure", () => {
    const r = parseForm(schema, fd({ name: "", km: "-5" }));
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.state.fieldErrors).toEqual({ name: "Name is required", km: "Must be 0 or more" });
    expect(r.state.values).toEqual({ name: "", km: "-5" });
    expect(r.state.message).toBe("Please fix the highlighted fields.");
  });

  it("does not echo file inputs back", () => {
    const f = fd({ name: "", km: "1" });
    f.set("photo", new File(["x"], "a.jpg"));
    const r = parseForm(schema, f);
    expect(r.success || r.state.values).not.toHaveProperty("photo");
  });
});
