import { z } from "zod";
import { isoDate, kmField, optionalInt, optionalText } from "./validators";

const currentYear = new Date().getFullYear();

export const vehicleDetailsSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(40),
  make: z.string().trim().min(1, "Make is required").max(40),
  model: z.string().trim().min(1, "Model is required").max(40),
  year: z.preprocess(
    (v) => (v === "" || v === undefined ? null : Number(v)),
    z.number().int().min(1950, "Year looks wrong").max(currentYear + 1, "Year looks wrong").nullable(),
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
