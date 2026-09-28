import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

// Reuse one pool across hot reloads in dev. `prepare: false` keeps us compatible with
// Neon's pooled (PgBouncer) connection string in production.
const client = globalForDb.pgClient ?? postgres(env.DATABASE_URL, { prepare: false, max: 5 });
if (env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema });
export type DB = typeof db;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
