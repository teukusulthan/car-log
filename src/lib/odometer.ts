import { addDays, diffDays, type ISODate } from "./dates";

export type Reading = { km: number; date: ISODate };

const AVERAGE_WINDOW_DAYS = 180;
const MIN_SPAN_DAYS = 7;

/** The reading that reflects the car's current state: most recent date, ties broken by higher km. */
export function latestReading(readings: Reading[]): Reading | null {
  let best: Reading | null = null;
  for (const r of readings) {
    if (!best || r.date > best.date || (r.date === best.date && r.km > best.km)) best = r;
  }
  return best;
}

/** Average km driven per day over recent readings, or null when there isn't enough data. */
export function averageDailyKm(readings: Reading[], today: ISODate): number | null {
  const since = addDays(today, -AVERAGE_WINDOW_DAYS);
  const recent = readings
    .filter((r) => r.date >= since && r.date <= today)
    .sort((a, b) => (a.date === b.date ? a.km - b.km : a.date < b.date ? -1 : 1));
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const days = diffDays(first.date, last.date);
  if (days < MIN_SPAN_DAYS || last.km <= first.km) return null;
  return Math.round((last.km - first.km) / days);
}

export type OdometerCheck = "ok" | "lower_than_before" | "higher_than_after";

/** Checks a new reading on `date` against existing history, so typos can be confirmed by the user. */
export function checkOdometer(readings: Reading[], date: ISODate, km: number): OdometerCheck {
  if (readings.some((r) => r.date <= date && r.km > km)) return "lower_than_before";
  if (readings.some((r) => r.date > date && r.km < km)) return "higher_than_after";
  return "ok";
}
