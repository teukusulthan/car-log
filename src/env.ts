import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(16),
  EMAIL_FROM: z.string().default("car-log <onboarding@resend.dev>"),
  RESEND_API_KEY: optional,
  R2_ACCOUNT_ID: optional,
  R2_ACCESS_KEY_ID: optional,
  R2_SECRET_ACCESS_KEY: optional,
  R2_BUCKET: optional,
  VAPID_PRIVATE_KEY: optional,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optional,
  VAPID_SUBJECT: z.string().default("mailto:admin@example.com"),
  CRON_SECRET: optional,
  /** Testing only: "file" writes sign-in codes to .dev/ in a local production build (ignored on Vercel). */
  LOGIN_EMAIL_SINK: optional,
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  if (process.env.SKIP_ENV_VALIDATION === "1") return process.env as unknown as Env;
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = load();
