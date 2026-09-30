/**
 * Production deploys migrate the database before building. Preview deploys share that database,
 * so they must never migrate it (an unmerged branch could change the live schema).
 */
export function shouldMigrateOnBuild(env: Record<string, string | undefined>): boolean {
  return env.VERCEL === "1" && env.VERCEL_ENV === "production";
}
