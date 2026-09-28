import { z } from "zod";
import { isISODate } from "./dates";

const digitsOnly = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : v);

export const MAX_KM = 2_000_000;

/** Whole kilometres; tolerates "12.345", "12 345 km". */
export const kmField = (label: string) =>
  z.preprocess(
    digitsOnly,
    z
      .string()
      .min(1, `${label} is required`)
      .transform(Number)
      .pipe(z.number().int().min(0).max(MAX_KM, `${label} looks too large`)),
  );

/** Whole rupiah; blank means 0. */
export const moneyField = z.preprocess(
  (v) => {
    const d = digitsOnly(v);
    return d === "" || d === undefined || d === null ? "0" : d;
  },
  z.string().transform(Number).pipe(z.number().int().min(0).max(2_000_000_000, "Amount looks too large")),
);

/** Optional whole number (blank → null). */
export const optionalInt = z.preprocess(
  (v) => {
    const d = digitsOnly(v);
    return d === "" || d === undefined ? null : Number(d);
  },
  z.number().int().min(1).max(MAX_KM).nullable(),
);

export const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable().optional().transform((v) => v ?? null));

/** A real calendar date in YYYY-MM-DD form (what <input type="date"> submits). */
export const isoDate = (message = "Pick a valid date") =>
  z.string().refine((v) => isISODate(v) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), message);
