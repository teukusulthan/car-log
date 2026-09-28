import { describe, expect, it } from "vitest";
import { normalizeEmail, safeCallbackPath } from "@/lib/auth-utils";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Budi@Example.COM ")).toBe("budi@example.com");
  });
  it("rejects values that are not an email", () => {
    expect(() => normalizeEmail("budi")).toThrow();
    expect(() => normalizeEmail("a@b.c, x@y.z")).toThrow();
  });
});

describe("safeCallbackPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeCallbackPath("/invite/abc")).toBe("/invite/abc");
  });
  it("falls back to / for absolute or protocol-relative URLs", () => {
    expect(safeCallbackPath("https://evil.com")).toBe("/");
    expect(safeCallbackPath("//evil.com")).toBe("/");
    expect(safeCallbackPath(undefined)).toBe("/");
  });
  it("rejects paths that browsers resolve to another origin", () => {
    expect(safeCallbackPath("/\t/evil.com")).toBe("/");
    expect(safeCallbackPath("/\n/evil.com")).toBe("/");
    expect(safeCallbackPath("/\\evil.com")).toBe("/");
  });
  it("keeps the query string", () => {
    expect(safeCallbackPath("/log?item=abc")).toBe("/log?item=abc");
  });
});
