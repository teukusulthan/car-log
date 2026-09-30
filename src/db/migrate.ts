import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { shouldMigrateOnBuild } from "./migrate-guard";

// Local runs read .env.local; on Vercel the variables come from the project settings.
config({ path: ".env.local", quiet: true });

async function main() {
  const onBuild = process.argv.includes("--on-build");
  if (onBuild && !shouldMigrateOnBuild(process.env)) {
    console.log(`[migrate] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}; only production deploys migrate)`);
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  // prepare: false keeps this compatible with pooled (PgBouncer) connection strings such as Neon's.
  const client = postgres(url, { max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    console.log(`[migrate] database "${new URL(url).pathname.slice(1)}" is up to date`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
