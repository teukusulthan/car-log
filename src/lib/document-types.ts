import type { DocumentType } from "@/db/schema";

export const DOCUMENT_PRESETS: Record<DocumentType, { label: string; title: string; remindDaysBefore: number; renewMonths: number }> = {
  insurance: { label: "Insurance", title: "Car insurance", remindDaysBefore: 30, renewMonths: 12 },
  stnk_annual: { label: "STNK annual tax", title: "STNK tax (annual)", remindDaysBefore: 30, renewMonths: 12 },
  stnk_5yr: { label: "STNK 5-year renewal", title: "STNK & plate renewal (5-year)", remindDaysBefore: 60, renewMonths: 60 },
  other: { label: "Other", title: "", remindDaysBefore: 14, renewMonths: 12 },
};
