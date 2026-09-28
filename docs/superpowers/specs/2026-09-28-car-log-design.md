# car-log — Household Car Maintenance PWA (Design Spec)

## Context
The user just got a new car and struggles to track its maintenance history. They want a mobile-only PWA, shared by their household (all iPhones), that logs services, tracks renewals, and pushes reminders before things are due. New greenfield project at `/home/teukusulthan/Developments/Projects/car-log`.

**Success:** logging a service takes <30s; you get a push before an oil change or insurance renewal is due; everyone in the household sees the same history.

**Assumptions (confirmed):** IDR currency, km, WIB timezone; online required for writes (app shell + history cached for offline viewing); email magic-link login; owner invites members by email.

## Architecture
| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript, Server Actions for mutations |
| UI | Tailwind + shadcn/ui, mobile-only layout (bottom tab bar, large touch targets) |
| DB | Neon Postgres + Drizzle ORM (drizzle-kit migrations) |
| Auth | Auth.js v5, email magic link via Resend, Drizzle adapter |
| Storage | Cloudflare R2, presigned PUT uploads, client-side image compression |
| PWA | Serwist service worker + web manifest; iOS "Add to Home Screen" onboarding |
| Push | `web-push` with VAPID; per-device subscriptions |
| Scheduler | Vercel Cron daily 07:00 WIB → `/api/cron/reminders` (guarded by `CRON_SECRET`) |
| Validation | Zod on all inputs |
| Tests | Vitest (unit + integration on real Postgres), Playwright (iPhone viewport) |

## Data model
- `users`, `households`, `household_members` (role: owner|member), `invites` (token, expires 7d, single-use)
- `vehicles` (household_id, make, model, year, plate, current_odometer), `odometer_readings` (vehicle_id, km, recorded_at, user_id)
- `maintenance_items` per vehicle (name, interval_km?, interval_months?) — seeded from default template (oil, oil filter, air filter, brake fluid, coolant, tires, battery)
- `service_records` (vehicle_id, date, odometer, workshop, total_cost, notes, created_by) + `service_record_items` (service_record_id, maintenance_item_id?, label, cost)
- `documents` (vehicle_id, type: insurance|stnk_annual|stnk_5yr|other, expires_at, remind_days_before)
- `attachments` (r2_key, mime, service_record_id? | document_id?)
- `push_subscriptions` (user_id, endpoint, p256dh, auth), `notification_log` (dedupe key, sent_at)

**Due logic (pure module `lib/due.ts`):** last done = latest service_record_item for that maintenance_item. due_date = last_date + interval_months; due_km = last_km + interval_km; projected date for km via avg daily km from odometer readings. Status: overdue if past either; due-soon if within 14 days or 500 km; else ok. No readings in 14 days → "update mileage" nudge.

## Screens
Bottom tabs: **Home · History · Documents · Settings**; vehicle switcher in header.
1. **Home** — odometer card + "Update mileage"; upcoming list sorted by urgency, colored; FAB "Log service".
2. **Log service** — date (today), odometer (prefilled), checklist of maintenance items with optional per-item cost, workshop (autocomplete), total (auto-sum, editable), receipt photo (camera). Save → odometer reading + resets due items.
3. **History** — timeline grouped by month; detail view w/ photos, edit/delete; cost summary header (year total, per type, monthly bars).
4. **Documents** — renewals with countdown; add/renew with photo.
5. **Vehicle setup** — add vehicle, edit maintenance schedule.
6. **Settings** — members & invites, per-device notification toggle, CSV export, sign out.

**Onboarding:** email → magic link → create household or accept invite → add first car → if not standalone, iOS Add-to-Home-Screen guide → once installed, user-gesture "Enable notifications".

## Security & errors
- `requireHouseholdAccess()` helper used by every Server Action/route; cross-household tests.
- R2 presigned URLs: 5-min expiry, image/* only, ≤10 MB; private bucket, signed GET URLs.
- Cron route rejects missing/invalid `CRON_SECRET`.
- Forms keep input on failure, show field + banner errors; explicit offline message on submit.
- Push 404/410 → delete subscription; per-device failures don't abort the cron run.
- Odometer lower than last reading → confirmation prompt.

## Build order (to be expanded by writing-plans)
1. Scaffold Next.js + Tailwind + shadcn, Drizzle + Neon, env config, Vitest/Playwright setup
2. Auth.js magic link + households, members, invites + `requireHouseholdAccess`
3. Vehicles, maintenance schedule template, odometer readings
4. Due logic module (TDD) + Home screen
5. Log service flow + History + cost summary
6. R2 attachments (receipts, documents)
7. Documents & renewals
8. PWA (Serwist, manifest, install guide) + web push subscribe + cron reminders w/ dedupe
9. Settings (CSV export, notification toggle), polish, deploy to Vercel

## Verification
- `npm run test` (Vitest unit: due logic, reminder selection/dedupe; integration: household isolation, log-service resets, invite accept)
- `npx playwright test` with iPhone 15 device profile (onboarding, log service, Home status update)
- `npm run build` clean
- Manual on real iPhone after Vercel deploy: install to Home Screen, enable notifications, trigger cron manually (`curl -H "Authorization: Bearer $CRON_SECRET" …/api/cron/reminders`) and receive push; capture receipt via camera.
