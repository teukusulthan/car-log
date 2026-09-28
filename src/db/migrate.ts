import "dotenv/config";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = postgres(url, { max: 1 });
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.end();
  console.log(`Migrated ${new URL(url).pathname.slice(1)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
