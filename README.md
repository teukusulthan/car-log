# car-log

A mobile-only PWA for a household to track car maintenance: service history with receipt photos, date/km-based reminders, insurance and STNK renewals, spending, and daily push notifications. It's built for iPhones installed to the Home Screen.

- **Stack:** Next.js 16 (App Router, Server Actions), Tailwind 4 + shadcn/ui, Drizzle + Postgres (Neon), Auth.js v5 (email + password), Cloudflare R2, Web Push, Vercel Cron.
- **Design docs:** `docs/superpowers/specs/2026-09-28-car-log-design.md` and `docs/superpowers/plans/2026-09-28-car-log-mvp.md`.

## Local development

Requirements: Node 20.9+, pnpm, and a Postgres 14+ database.

```bash
pnpm install
cp .env.example .env.local        # fill DATABASE_URL and AUTH_SECRET at minimum
pnpm db:migrate
pnpm dev
```

- **Accounts:** open `/signup` to create an account with email and password. After 5 wrong passwords an account is locked for 15 minutes.
- **Photos without R2:** leave the `R2_*` variables empty. Uploads are saved under `.data/uploads/`.
- **Service worker:** it only registers in production builds. Set `NEXT_PUBLIC_ENABLE_SW=1` to test it under `pnpm dev`.

### Tests

| Command | What it runs |
|---|---|
| `pnpm test:unit` | Pure logic: due dates, odometer, formatting, reminders, CSV, validators |
| `pnpm test:integration` | Queries against a real Postgres. Uses `carlog_test` by default and truncates it, so set `DATABASE_URL` to a `*_test` database |
| `pnpm test:e2e` | Builds the app, runs it against `carlog_e2e`, and drives it in an iPhone 15 viewport with Playwright |
| `pnpm lint && pnpm typecheck` | Static checks |

The e2e tests run in Chromium with iPhone emulation. If WebKit's system libraries are installed (`pnpm exec playwright install-deps webkit`), switch `defaultBrowserType` in `playwright.config.ts` to `"webkit"`.

## Deploying (Vercel + Neon + R2)

1. **Database:** create a Neon project and copy the **pooled** connection string into `DATABASE_URL`. Run `DATABASE_URL=… pnpm db:migrate` once, and again after every schema change.
2. **Photos:**
   - Create a **private** R2 bucket.
   - Create an API token with Object Read & Write access to that bucket.
   - Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and `R2_BUCKET`.
3. **Push:**
   - Run `pnpm dlx web-push generate-vapid-keys`.
   - Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
   - Set `VAPID_SUBJECT` to a `mailto:` address you own.
4. **Auth and cron:**
   - Set `AUTH_SECRET` (`openssl rand -base64 32`).
   - Set `CRON_SECRET` to a long random string. Vercel sends it to `/api/cron/reminders`.
5. **Deploy on Vercel.** `vercel.json` schedules the reminder job daily at 00:00 UTC (07:00 WIB). To trigger it by hand:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/reminders
   ```

## Installing on iPhone

1. Open the site in **Safari**, tap **Share**, then **Add to Home Screen**.
2. Open car-log from the Home Screen icon and log in with your email and password. Installed apps keep their own login, separate from Safari.
3. Tap **Turn on reminders** (Home or Settings) and allow notifications. Use **Send a test** in Settings to check it works.
4. To share with family: go to **Settings → Invite family member**. The link works once and expires after 7 days.

## How reminders work

- **Due calculation:** each car has a schedule, such as engine oil every 10,000 km or 6 months. An item is **due soon** within 14 days or 500 km of whichever limit comes first, and **overdue** once past either limit. The app estimates when the km limit will be reached from your recent odometer readings.
- **What gets sent:** once a day, each household gets one grouped notification per car with anything due. It also gets one notification for each expiring document, and a reminder to update the odometer if it hasn't changed in 14 days.
- **No repeats:** each reminder is sent once per service cycle. Logging the service starts a new cycle.
