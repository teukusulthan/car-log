import { describe, expect, it } from "vitest";
import { LOGIN_CODE_LENGTH, generateLoginCode, normalizeEmail, safeCallbackPath } from "@/lib/auth-utils";

describe("generateLoginCode", () => {
  it("returns digits only, of the configured length", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateLoginCode()).toMatch(new RegExp(`^\\d{${LOGIN_CODE_LENGTH}}$`));
    }
  });
  it("does not repeat across calls", () => {
    const codes = new Set(Array.from({ length: 200 }, generateLoginCode));
    expect(codes.size).toBe(200);
  });
});

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
