import { describe, expect, it } from "vitest";
import { shouldMigrateOnBuild } from "@/db/migrate-guard";

describe("shouldMigrateOnBuild", () => {
  it("migrates on Vercel production builds", () => {
    expect(shouldMigrateOnBuild({ VERCEL: "1", VERCEL_ENV: "production" })).toBe(true);
  });
  it("skips preview and development builds, which share the production database", () => {
    expect(shouldMigrateOnBuild({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldMigrateOnBuild({ VERCEL: "1", VERCEL_ENV: "development" })).toBe(false);
  });
  it("skips builds outside Vercel (local `pnpm build`, CI)", () => {
    expect(shouldMigrateOnBuild({})).toBe(false);
  });
});
