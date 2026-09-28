export type ScheduleTemplateItem = { name: string; intervalKm: number | null; intervalMonths: number | null };

/** Sensible defaults for a modern petrol car; every household can edit them per vehicle. */
export const DEFAULT_SCHEDULE: ScheduleTemplateItem[] = [
  { name: "Engine oil", intervalKm: 10_000, intervalMonths: 6 },
  { name: "Oil filter", intervalKm: 10_000, intervalMonths: 6 },
  { name: "Tire rotation", intervalKm: 10_000, intervalMonths: null },
  { name: "Air filter", intervalKm: 20_000, intervalMonths: 12 },
  { name: "Cabin (AC) filter", intervalKm: 20_000, intervalMonths: 12 },
  { name: "Battery check", intervalKm: null, intervalMonths: 12 },
  { name: "Brake fluid", intervalKm: null, intervalMonths: 24 },
  { name: "Coolant", intervalKm: 40_000, intervalMonths: 24 },
  { name: "Spark plugs", intervalKm: 40_000, intervalMonths: null },
];
