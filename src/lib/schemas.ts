import { z } from "zod";
import { isoDate, kmField, moneyField, optionalInt, optionalText } from "./validators";

export const vehicleDetailsSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(40),
  make: z.string().trim().min(1, "Make is required").max(40),
  model: z.string().trim().min(1, "Model is required").max(40),
  year: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z
      .number()
      .int()
      .min(1950, "Year looks wrong")
      .refine((y) => y <= new Date().getFullYear() + 1, "Year looks wrong")
      .nullable(),
  ),
  plate: optionalText(15).transform((v) => v?.toUpperCase() ?? null),
});

export const newVehicleSchema = vehicleDetailsSchema.extend({
  trackedSince: isoDate(),
  odometer: kmField("Odometer"),
});

export const scheduleItemSchema = z
  .object({
    id: z.uuid().optional(),
    name: z.string().trim().min(1, "Name is required").max(60),
    intervalKm: optionalInt,
    intervalMonths: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
      z.number().int().min(1).max(240).nullable(),
    ),
  })
  .refine((i) => i.intervalKm !== null || i.intervalMonths !== null, {
    message: "Set a km or month interval",
    path: ["intervalKm"],
  });

export const scheduleSchema = z.array(scheduleItemSchema).max(50);

export const odometerSchema = z.object({
  vehicleId: z.uuid(),
  km: kmField("Odometer"),
  confirm: z.string().optional(),
});

export const serviceItemSchema = z.object({
  maintenanceItemId: z.uuid().nullable().optional(),
  label: z.string().trim().min(1, "Describe the work").max(80),
  cost: z.number().int().min(0).max(2_000_000_000).nullable().optional(),
});

export const serviceFormSchema = z.object({
  vehicleId: z.uuid(),
  date: isoDate(),
  odometer: kmField("Odometer"),
  workshop: optionalText(80),
  notes: optionalText(1000),
  totalCost: moneyField,
  items: z.preprocess(
    (v) => {
      try {
        return typeof v === "string" ? JSON.parse(v) : v;
      } catch {
        return [];
      }
    },
    z.array(serviceItemSchema).min(1, "Pick at least one thing that was done").max(40),
  ),
  confirm: z.string().optional(),
});

export const documentFormSchema = z.object({
  vehicleId: z.uuid(),
  type: z.enum(["insurance", "stnk_annual", "stnk_5yr", "other"]),
  title: z.string().trim().min(1, "Give it a name").max(80),
  expiresOn: isoDate(),
  remindDaysBefore: z.coerce.number().int().min(0, "Must be 0 or more").max(365, "At most 365 days"),
  notes: optionalText(1000),
});

export const renewSchema = z.object({ expiresOn: isoDate() });
