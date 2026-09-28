import { afterAll, beforeEach } from "vitest";

process.env.DATABASE_URL ??= "postgres://carlog:carlog_local_dev@127.0.0.1:5433/carlog_test";
if (!process.env.DATABASE_URL.includes("test")) {
  throw new Error("Integration tests must run against a *_test database");
}
process.env.AUTH_SECRET ??= "integration-test-secret-value";

beforeEach(async () => {
  const { resetDb } = await import("./factories");
  await resetDb();
});

afterAll(async () => {
  const { closeDb } = await import("./factories");
  await closeDb();
});
