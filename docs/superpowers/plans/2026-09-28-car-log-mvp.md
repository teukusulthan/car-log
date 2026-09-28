# car-log MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a usable, mobile-only household car-maintenance PWA: service log with receipts, date/km due tracking, renewals, cost summary, shared household, push reminders.

**Architecture:** One Next.js 16 App Router app. Pure domain logic (`src/lib/*`) is framework-free and unit-tested. Data access lives in `src/server/queries/*` — every function takes an explicit `householdId` so isolation is enforced (and integration-tested) at the query layer. Server Actions in `src/server/actions/*` are thin: authenticate → validate (Zod) → call query → revalidate. Derived state (current odometer, last-done per item) is computed from rows, never stored, so edits/deletes can never leave stale "due" state.

**Tech Stack:** Next.js 16 (App Router, React 19, Turbopack), TypeScript strict, Tailwind CSS 4 + shadcn/ui, Drizzle ORM + `postgres` driver (Neon in prod, local PG in dev), Auth.js v5 (`next-auth@beta`) with Resend magic link + Drizzle adapter, Cloudflare R2 via `@aws-sdk/client-s3`, `web-push`, Zod 4, Vitest, Playwright (WebKit iPhone profile).

**Spec:** `docs/superpowers/specs/2026-09-28-car-log-design.md`

## Global Constraints

- Mobile-only UI: layout max width `28rem`, centered; bottom tab bar respects `env(safe-area-inset-bottom)`; touch targets ≥ 44px; `viewport-fit=cover`.
- Currency IDR (integer rupiah, formatted `Rp 1.250.000`), distances km (integer), timezone `Asia/Jakarta`. Calendar dates (service date, expiry) stored as Postgres `date` / `YYYY-MM-DD` strings — never as timestamps.
- "Due soon" thresholds: 14 days or 500 km. Mileage nudge after 14 days without a reading. Invite expiry 7 days, single use.
- Every query touching household data takes `householdId` and filters by it; cross-household access returns "not found", never "forbidden".
- Uploads: images only (`image/jpeg|png|webp|heic`), ≤ 4 MB after client compression, private storage, served only through an access-checked route.
- Writes require network; the app shell and previously viewed pages remain viewable offline.
- One household per user (MVP).
- No secrets in the repo; all config via env validated in `src/env.ts`.

## Deviations from spec (deliberate)

1. **Service worker hand-written (`public/sw.js`) instead of Serwist** — `@serwist/next` is a webpack plugin and Next 16 builds with Turbopack; our SW needs ~100 lines (cache shell, push, notificationclick). Less tooling, same behavior.
2. **Receipt upload goes through a Server Action (FormData) instead of presigned PUT** — images are compressed client-side to well under Vercel's 4.5 MB body limit, and server-side upload lets us validate type/size and household in one place. Files are still private in R2 and read through short-lived signed URLs.
3. **Invites are shared as links (iOS share sheet → WhatsApp etc.)** rather than emailed; email magic link still used for sign-in.

## Review Focus

1. **Late-evening entries in WIB** (e.g. 23:30 Jakarta = 16:30 UTC) must default to the Jakarta calendar date, not UTC → `todayInJakarta()` test in Task 2.
2. **Month-end intervals** — last service Jan 31 + 1 month must be due Feb 28/29, not Mar 3 → `addMonths` test in Task 2.
3. **Back-dated / edited / deleted services** — entering last year's service must not lower the current odometer; deleting the latest oil change must fall back to the previous one's due date → tests in Tasks 6 and 8.
4. **Guessing another household's ids** (vehicle, service record, document, file) must 404 → isolation tests in Tasks 5, 8, 10, 11.
5. **Cron running twice / after a reset** — no duplicate push for the same due cycle, but a new cycle after servicing notifies again → Task 13 tests.

---

## File Structure

```
src/
  env.ts                      # zod-validated env
  auth.ts                     # Auth.js config (Resend magic link / dev file sink)
  db/schema.ts                # all tables
  db/index.ts                 # drizzle client (singleton)
  lib/dates.ts                # YYYY-MM-DD helpers, Jakarta "today"
  lib/due.ts                  # maintenance due computation (pure)
  lib/odometer.ts             # odometer consistency + avg daily km (pure)
  lib/documents.ts            # renewal status (pure)
  lib/reminders.ts            # choose notifications + dedupe keys (pure)
  lib/format.ts               # IDR, km, relative-days copy
  lib/maintenance-template.ts # default schedule
  lib/utils.ts                # shadcn cn()
  server/access.ts            # requireUser / requireMembership / current vehicle
  server/storage.ts           # R2 or local-disk storage
  server/push.ts              # web-push sender
  server/queries/{households,vehicles,services,documents,attachments,reminders}.ts
  server/actions/{household,vehicles,services,documents,push,auth}.ts
  app/
    layout.tsx, manifest.ts, globals.css, offline/page.tsx
    login/page.tsx, login/check-email/page.tsx
    invite/[token]/page.tsx
    onboarding/page.tsx
    (app)/layout.tsx          # guards + header + bottom nav
    (app)/page.tsx            # Home
    (app)/log/page.tsx        # Log service
    (app)/history/page.tsx, (app)/history/[id]/page.tsx, (app)/history/[id]/edit/page.tsx
    (app)/documents/page.tsx, (app)/documents/new/page.tsx, (app)/documents/[id]/page.tsx
    (app)/vehicles/new/page.tsx, (app)/vehicles/[id]/page.tsx
    (app)/settings/page.tsx
    api/auth/[...nextauth]/route.ts
    api/files/[id]/route.ts
    api/export/route.ts
    api/cron/reminders/route.ts
  components/                 # ui/ (shadcn) + feature components
public/sw.js, public/icons/*
tests/unit/*.test.ts, tests/integration/*.test.ts, tests/integration/setup.ts
e2e/*.spec.ts
drizzle/ (generated migrations), drizzle.config.ts, vercel.json, .env.example
```

---

### Task 1: Scaffold + tooling

**Files:** Create project via `create-next-app`, `src/env.ts`, `vitest.config.ts`, `.env.example`, `.env.local`, `package.json` scripts.

**Produces:** `env` object (`import { env } from "@/env"`) with `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL?`, `RESEND_API_KEY?`, `EMAIL_FROM`, `R2_*?`, `VAPID_PUBLIC_KEY?`, `VAPID_PRIVATE_KEY?`, `VAPID_SUBJECT`, `CRON_SECRET?`; `NEXT_PUBLIC_VAPID_PUBLIC_KEY?`.

- [ ] Step 1: `pnpm create next-app@latest car-log-tmp --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack`, move contents into `car-log/` (keeping `docs/`).
- [ ] Step 2: `pnpm dlx shadcn@latest init` (neutral base), add components: `button input label card sheet dialog select checkbox textarea badge sonner separator tabs`.
- [ ] Step 3: Add deps: `drizzle-orm postgres next-auth@beta @auth/drizzle-adapter zod web-push @aws-sdk/client-s3 @aws-sdk/s3-request-presigner resend lucide-react`; dev: `drizzle-kit vitest @vitest/coverage-v8 @playwright/test @types/web-push tsx dotenv`.
- [ ] Step 4: `src/env.ts` — Zod schema over `process.env`, throws with a readable list of missing vars (skipped when `SKIP_ENV_VALIDATION=1`).
- [ ] Step 5: Scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `test:e2e` (`playwright test`), `db:generate`, `db:migrate` (`tsx src/db/migrate.ts`), `db:studio`.
- [ ] Step 6: Create local DBs `carlog` and `carlog_test` on `localhost:5433`; fill `.env.local`.
- [ ] Step 7: `pnpm typecheck && pnpm build` pass → commit `chore: scaffold next.js app with tooling`.

### Task 2: Date, due, odometer and renewal logic (TDD, pure)

**Files:** `src/lib/dates.ts`, `src/lib/odometer.ts`, `src/lib/due.ts`, `src/lib/documents.ts`, tests in `tests/unit/`.

**Produces:**
```ts
// dates.ts  (ISODate = "YYYY-MM-DD")
todayInJakarta(now?: Date): ISODate
addDays(d: ISODate, n: number): ISODate
addMonths(d: ISODate, n: number): ISODate      // clamps to month end
diffDays(from: ISODate, to: ISODate): number   // to - from
// odometer.ts
type Reading = { km: number; date: ISODate }
latestReading(readings: Reading[]): Reading | null  // max date, tie → max km
averageDailyKm(readings: Reading[], today: ISODate): number | null // needs ≥2 readings spanning ≥7 days, window 180d
checkOdometer(readings: Reading[], date: ISODate, km: number): "ok" | "lower_than_before" | "higher_than_after"
// due.ts
type DueStatus = "overdue" | "due_soon" | "ok"
type DueInput = { intervalKm: number | null; intervalMonths: number | null; last: { date: ISODate; km: number } }
type DueResult = { status: DueStatus; dueDate: ISODate | null; dueKm: number | null; daysLeft: number | null; kmLeft: number | null; projectedDate: ISODate | null }
computeDue(input: DueInput, ctx: { today: ISODate; currentKm: number; avgDailyKm: number | null }): DueResult
compareDue(a: DueResult, b: DueResult): number   // overdue first, then soonest
// documents.ts
renewalStatus(expiresOn: ISODate, remindDaysBefore: number, today: ISODate): { status: "expired" | "due_soon" | "ok"; daysLeft: number }
```

Test cases (each a `it()`):
- `todayInJakarta(new Date("2026-09-28T17:30:00Z"))` → `"2026-09-29"`; `T16:59Z` → `"2026-09-28"`.
- `addMonths("2026-01-31", 1)` → `"2026-02-28"`; `("2028-01-31",1)` → `"2028-02-29"`; `("2026-11-15", 3)` → `"2027-02-15"`.
- `diffDays("2026-09-28","2026-10-12")` → 14.
- `latestReading` ignores a back-dated higher-km-older-date? → picks max date.
- `averageDailyKm`: readings 0 km @ 09-01 and 700 km @ 09-15 → 50; single reading → null; span 3 days → null.
- `checkOdometer`: km below a reading on/before date → `lower_than_before`; above a reading after date → `higher_than_after`; else ok.
- `computeDue`: months-only (last 2026-03-01, 6 mo, today 09-20 → due 09-01, overdue); km-only (last 10000, 10000 km, current 19600 → due_soon, kmLeft 400); both → earlier trigger wins; km projection (avg 50/day, 2000 km left → projectedDate today+40, ok); exactly at due km → due_soon (kmLeft 0) and past → overdue; neither interval → ok with nulls.
- `renewalStatus`: 10 days left with remind 14 → due_soon; −1 → expired; 30 left → ok.

- [ ] Step 1: write tests → Step 2: run, see FAIL → Step 3: implement → Step 4: PASS → Step 5: commit `feat: add pure due/odometer/renewal logic`.

### Task 3: Database schema + migrations + test harness

**Files:** `src/db/schema.ts`, `src/db/index.ts`, `src/db/migrate.ts`, `drizzle.config.ts`, `tests/integration/setup.ts`, `vitest.config.ts` (projects: unit, integration).

**Tables** (uuid PKs via `defaultRandom()`, `created_at timestamptz default now()`):
- Auth.js: `user` (id text, name, email unique, emailVerified, image), `account`, `session`, `verificationToken` — exact shapes from `@auth/drizzle-adapter` docs.
- `households(id, name)`; `household_members(household_id → cascade, user_id → cascade, role 'owner'|'member', unique(user_id))`; `invites(id, household_id, token unique, created_by, expires_at, used_at, used_by)`.
- `vehicles(id, household_id, name, make, model, year int?, plate?, tracked_since date)`.
- `odometer_readings(id, vehicle_id → cascade, km int, date date, service_record_id → cascade nullable, created_by)`.
- `maintenance_items(id, vehicle_id → cascade, name, interval_km int?, interval_months int?, sort int)`.
- `service_records(id, vehicle_id → cascade, date date, odometer int, workshop?, total_cost int, notes?, created_by)`; `service_record_items(id, service_record_id → cascade, maintenance_item_id → set null, label, cost int?)`.
- `documents(id, vehicle_id → cascade, type 'insurance'|'stnk_annual'|'stnk_5yr'|'other', title, expires_on date, remind_days_before int default 30, notes?)`.
- `attachments(id, household_id, storage_key unique, content_type, size int, service_record_id → cascade?, document_id → cascade?)`.
- `push_subscriptions(id, user_id → cascade, endpoint unique, p256dh, auth, user_agent?)`.
- `notification_log(id, household_id, key, sent_at)`, `unique(household_id, key)`.

Indexes on every FK used in filters (`vehicle_id`, `household_id`, `service_record_id`).

**Produces:** `db` (drizzle instance), `schema` namespace export, integration helper `resetDb()` (truncate all tables) + `makeHousehold()` factory in `tests/integration/factories.ts` returning `{ householdId, userId, vehicleId }`.

- [ ] Steps: write schema → `pnpm db:generate` → `pnpm db:migrate` on dev + test DB → smoke integration test inserting household+vehicle passes → commit `feat: add database schema and migrations`.

### Task 4: Auth (magic link) + access helpers

**Files:** `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/login/page.tsx`, `src/app/login/check-email/page.tsx`, `src/server/access.ts`, `src/server/actions/auth.ts`.

**Behavior:** Resend provider with custom `sendVerificationRequest`: if `RESEND_API_KEY` set → send branded email; else log URL and write it to `.dev/last-magic-link.txt` (non-production only; e2e reads it). Database sessions (Drizzle adapter), 90-day max age. Pages: `signIn: /login`, `verifyRequest: /login/check-email`.

**Produces (`server/access.ts`):**
```ts
requireUser(): Promise<{ id: string; email: string; name: string | null }>          // redirect("/login")
getMembership(userId: string): Promise<{ householdId: string; role: "owner"|"member" } | null>
requireMembership(): Promise<{ user; householdId: string; role }>                   // redirect("/onboarding")
getCurrentVehicleId(householdId: string): Promise<string | null>                     // cookie "cl_vehicle", validated, falls back to first vehicle
```
- [ ] Steps: implement → manual check login flow in dev (link from file) → commit `feat: add magic-link auth and access helpers`.

### Task 5: Households, onboarding, invites

**Files:** `src/server/queries/households.ts`, `src/server/actions/household.ts`, `src/app/onboarding/page.tsx`, `src/app/invite/[token]/page.tsx`, `tests/integration/households.test.ts`.

**Produces:**
```ts
createHousehold(userId: string, name: string): Promise<string>
createInvite(householdId: string, userId: string, now?: Date): Promise<{ token: string; expiresAt: Date }>
acceptInvite(token: string, userId: string, now?: Date): Promise<{ ok: true; householdId: string } | { ok: false; reason: "invalid" | "expired" | "used" | "already_member" }>
listMembers(householdId: string): Promise<{ userId; email; name; role }[]>
removeMember(householdId: string, actorRole: string, userId: string): Promise<void> // owner only
```
Tests: accept valid → member; second accept of same token → `used`; expired (now + 8d) → `expired`; user already in a household → `already_member`; `listMembers` of household A never returns B's users.

Onboarding page: if already member → redirect `/`. Form: household name (default "My garage") → then vehicle form (Task 6's `VehicleForm`), single-page two-step.
- [ ] TDD steps → commit `feat: households, onboarding and invites`.

### Task 6: Vehicles, schedule, odometer

**Files:** `src/lib/maintenance-template.ts`, `src/server/queries/vehicles.ts`, `src/server/actions/vehicles.ts`, `src/components/vehicle-form.tsx`, `src/components/schedule-editor.tsx`, `src/app/(app)/vehicles/new/page.tsx`, `src/app/(app)/vehicles/[id]/page.tsx`, `tests/integration/vehicles.test.ts`.

**Template:** Engine oil 10 000 km / 6 mo; Oil filter 10 000 / 6; Air filter 20 000 / 12; Cabin (AC) filter 20 000 / 12; Brake fluid — / 24; Coolant 40 000 / 24; Spark plugs 40 000 / —; Tire rotation 10 000 / —; Battery check — / 12.

**Produces:**
```ts
createVehicle(householdId, userId, input: { name; make; model; year?; plate?; trackedSince: ISODate; odometer: number }): Promise<string> // seeds template + initial reading
getVehicle(householdId, vehicleId): Promise<Vehicle | null>
listVehicles(householdId): Promise<Vehicle[]>
updateVehicle(householdId, vehicleId, input): Promise<void>
deleteVehicle(householdId, vehicleId): Promise<void>
saveSchedule(householdId, vehicleId, items: { id?; name; intervalKm; intervalMonths }[]): Promise<void>
addReading(householdId, vehicleId, userId, { km; date }): Promise<void>
getVehicleStatus(householdId, vehicleId, today): Promise<{ vehicle; currentKm; lastReadingDate; avgDailyKm; items: (MaintenanceItem & { due: DueResult; last: {date;km} | null })[] } | null>
```
`getVehicleStatus` baseline for never-serviced items = `{ date: trackedSince, km: initial reading km }`.
Tests: create seeds 9 items + reading; `getVehicle` with other household → null; back-dated reading (older date, higher km) doesn't change `currentKm`; status sorts overdue first.
Action `updateOdometer` returns `{ needsConfirm: true }` when `checkOdometer` ≠ ok and `confirm` flag absent.
- [ ] TDD steps → commit `feat: vehicles, maintenance schedule and odometer`.

### Task 7: App shell + Home

**Files:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(app)/layout.tsx`, `src/components/bottom-nav.tsx`, `src/components/vehicle-switcher.tsx`, `src/components/due-list.tsx`, `src/components/odometer-sheet.tsx`, `src/app/(app)/page.tsx`, `src/lib/format.ts` (+ unit tests).

**Produces (`format.ts`):** `formatIDR(n)` → `"Rp 1.250.000"`; `formatKm(n)` → `"12.345 km"`; `formatDate(d)` → `"28 Sep 2026"`; `describeDue(due: DueResult)` → e.g. `"Due in ~400 km"`, `"Overdue by 12 days"`, `"In 3 months"`.

Home: header (vehicle switcher → sets cookie via action), odometer card with "Update mileage" (bottom `Sheet`, numeric keypad `inputMode="numeric"`), stale-reading hint if > 14 days, due list grouped Overdue / Due soon / Upcoming with colored badges, FAB "Log service" above the tab bar. Empty state when no vehicles → link to add vehicle.
- [ ] Steps: format tests → implement → build → commit `feat: app shell and home dashboard`.

### Task 8: Log / edit / delete service

**Files:** `src/server/queries/services.ts`, `src/server/actions/services.ts`, `src/components/service-form.tsx`, `src/app/(app)/log/page.tsx`, `src/app/(app)/history/[id]/edit/page.tsx`, `tests/integration/services.test.ts`.

**Produces:**
```ts
type ServiceInput = { vehicleId; date: ISODate; odometer: number; workshop?: string; notes?: string; totalCost: number; items: { maintenanceItemId?: string; label: string; cost?: number }[] }
createService(householdId, userId, input): Promise<string>   // tx: record + items + odometer reading(service_record_id)
updateService(householdId, recordId, input): Promise<void>   // tx: replace items, update reading
deleteService(householdId, recordId): Promise<void>
getService(householdId, recordId): Promise<ServiceDetail | null>
listWorkshops(householdId): Promise<string[]>
```
Tests: create resets oil due (baseline = service); delete newest oil service → due falls back to previous; update changes reading km; recordId from other household → null / no-op throw NotFound; back-dated service doesn't change currentKm.
Form: date default `todayInJakarta()`, odometer default current, item checklist with optional cost (total auto-sums unless edited manually), "Other" free-text item, workshop `<datalist>`, notes, receipt photos (Task 10 hooks in), inline Zod errors, keeps values on error, offline guard (`navigator.onLine` → toast "You're offline — connect to save").
- [ ] TDD steps → commit `feat: log, edit and delete services`.

### Task 9: History + cost summary

**Files:** `src/server/queries/services.ts` (add), `src/app/(app)/history/page.tsx`, `src/app/(app)/history/[id]/page.tsx`, `src/components/cost-summary.tsx`, `tests/integration/services.test.ts` (add).

**Produces:**
```ts
listServices(householdId, vehicleId): Promise<ServiceListItem[]>   // newest first, with item labels + attachment count
costSummary(householdId, vehicleId, year: number): Promise<{ total: number; byMonth: number[/*12*/]; byItem: { label; total }[] }>
```
Tests: costSummary only counts that year and that household; byItem uses item costs, remainder (total − sum(item costs)) goes to "Other/labor".
UI: year switcher, total, 12 CSS bars, top items; timeline grouped by month; detail page with items, photos grid (tap → full), edit/delete (confirm dialog).
- [ ] TDD steps → commit `feat: service history and cost summary`.

### Task 10: Attachments (receipts & document photos)

**Files:** `src/server/storage.ts`, `src/server/queries/attachments.ts`, `src/server/actions/attachments.ts` (upload inside service/document actions), `src/components/photo-picker.tsx` (client compression via `createImageBitmap` + canvas → JPEG q0.8, max 1600px), `src/app/api/files/[id]/route.ts`, `tests/integration/attachments.test.ts`.

**Produces:**
```ts
interface Storage { put(key: string, body: Buffer, contentType: string): Promise<void>; getUrl(key: string): Promise<string | null>; read?(key: string): Promise<Buffer | null>; remove(key: string): Promise<void> }
storage: Storage  // R2 when R2_* env present, else local `.data/uploads`
saveAttachments(householdId, owner: { serviceRecordId } | { documentId }, files: File[]): Promise<void>  // validates type & size
getAttachmentForUser(householdId, attachmentId): Promise<Attachment | null>
```
File route: requireMembership → `getAttachmentForUser` → R2: 302 to signed URL (5 min); local: stream with `Cache-Control: private, max-age=300`.
Tests: other household's attachment id → null; non-image rejected; > 4 MB rejected; deleting service removes attachment rows (storage cleanup best-effort).
- [ ] TDD steps → commit `feat: receipt photo attachments`.

### Task 11: Documents & renewals

**Files:** `src/server/queries/documents.ts`, `src/server/actions/documents.ts`, `src/components/document-form.tsx`, `src/app/(app)/documents/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `tests/integration/documents.test.ts`.

**Produces:**
```ts
createDocument(householdId, input: { vehicleId; type; title; expiresOn; remindDaysBefore; notes? }): Promise<string>
updateDocument(householdId, id, input): Promise<void>
renewDocument(householdId, id, newExpiresOn: ISODate): Promise<void>
deleteDocument(householdId, id): Promise<void>
listDocuments(householdId, vehicleId?): Promise<(Document & { renewal: ReturnType<typeof renewalStatus> })[]>  // soonest first
```
Type presets fill title + default remind days: Insurance (30), STNK annual tax (30), STNK 5-year (60), Other (14). Home shows the top expiring document in the due list.
Tests: isolation; renew moves status to ok; list order.
- [ ] TDD steps → commit `feat: documents and renewals`.

### Task 12: PWA (manifest, icons, service worker, install guide)

**Files:** `src/app/manifest.ts`, `scripts/generate-icons.ts` (sharp → 192/512/maskable/apple-touch 180), `public/sw.js`, `src/components/sw-register.tsx`, `src/components/install-guide.tsx`, `src/app/offline/page.tsx`, `src/components/offline-banner.tsx`.

SW: precache `/offline` + icons on install; navigations network-first → cache fallback → `/offline`; `/_next/static/*` cache-first; never cache `/api/*` or non-GET; `push` → `showNotification(title, { body, data: { url }, icon, badge })`; `notificationclick` → focus/open `data.url`; message `CLEAR_CACHES` on sign-out.
Install guide: shown on Home when not `display-mode: standalone` and iOS UA — 3 illustrated steps (Share → Add to Home Screen → open from icon); dismissible (localStorage).
Metadata: `appleWebApp: { capable: true, statusBarStyle: "default", title: "car-log" }`, `themeColor` light/dark.
- [ ] Steps: implement → `pnpm build` → Playwright check manifest served & SW registers → commit `feat: installable PWA with offline shell`.

### Task 13: Push notifications + daily reminders

**Files:** `src/lib/reminders.ts`, `tests/unit/reminders.test.ts`, `src/server/push.ts`, `src/server/queries/reminders.ts`, `src/server/actions/push.ts`, `src/components/notification-toggle.tsx`, `src/app/api/cron/reminders/route.ts`, `vercel.json`, `tests/integration/reminders.test.ts`.

**Produces:**
```ts
type Reminder = { key: string; title: string; body: string; url: string }
buildReminders(input: { vehicles: { id; name; items: { id; name; due: DueResult; last: { date: ISODate } | null; baselineDate: ISODate }[]; lastReadingDate: ISODate | null }[]; documents: { id; title; vehicleName; expiresOn: ISODate; renewal }[]; today: ISODate }): Reminder[]
// keys: item:{itemId}:{cycleDate}:{due_soon|overdue}, doc:{docId}:{expiresOn}:{due_soon|expired}, odo:{vehicleId}:{lastReadingDate}
runReminders(now?: Date): Promise<{ households: number; sent: number; failed: number }>
```
`runReminders`: for each household → build reminders → `insert notification_log on conflict do nothing returning` → send new ones to every member subscription; 404/410 → delete subscription; errors counted, not thrown.
Cron route: `Authorization: Bearer ${CRON_SECRET}` else 401; `vercel.json` cron `0 0 * * *` (07:00 WIB).
Toggle: in Settings/Home; requires standalone on iOS (explain otherwise); `Notification.requestPermission()` on tap → `pushManager.subscribe({ userVisibleOnly, applicationServerKey })` → action saves; off → unsubscribe + delete.
Tests: unit — overdue item yields `overdue` key; same cycle stable key; after new service, key changes; ok items produce nothing; stale reading yields odo key. Integration — `runReminders` twice logs once (send stubbed via injectable sender).
- [ ] TDD steps → commit `feat: push reminders with daily cron`.

### Task 14: Settings, export, sign-out

**Files:** `src/app/(app)/settings/page.tsx`, `src/components/invite-button.tsx` (Web Share API, copy fallback), `src/app/api/export/route.ts`, `src/server/actions/auth.ts` (signOut).

Settings sections: Account (email, sign out), Household (members, invite, remove — owner), Vehicles (list → edit, add), Notifications (toggle), Data (Export CSV). CSV: date, vehicle, odometer, workshop, items, total, notes; RFC4180 escaping (unit-tested `toCsv`).
- [ ] Steps → commit `feat: settings, invites UI and CSV export`.

### Task 15: E2E, polish, deploy docs

**Files:** `playwright.config.ts` (webServer `pnpm build && pnpm start` on test DB, project `iPhone 15` WebKit), `e2e/core.spec.ts`, `README.md`, `.env.example`.

E2E flow: login via magic link file → onboarding (household + car at 5 000 km) → Home shows items → log oil change → Home oil item shows "In 6 months" → update mileage lower → confirm prompt → history shows record & cost → add insurance doc expiring in 10 days → Home shows it due soon.
Polish pass: loading skeletons (`loading.tsx`), `error.tsx`/`not-found.tsx`, toasts on success, disabled buttons while pending (`useActionState`), focus/labels a11y, dark mode.
README: setup, env, Neon/R2/Resend/VAPID/Vercel deploy steps, iPhone install steps.
- [ ] Steps: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` all green → commit `test: e2e core flow; docs: deploy guide`.
