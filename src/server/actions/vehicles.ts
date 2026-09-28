"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { todayInJakarta } from "@/lib/dates";
import { type ActionState, formValues, parseForm } from "@/lib/form";
import { checkOdometer } from "@/lib/odometer";
import { formatKm } from "@/lib/format";
import { newVehicleSchema, odometerSchema, scheduleSchema, vehicleDetailsSchema } from "@/lib/schemas";
import { NotFoundError, VEHICLE_COOKIE, requireMembership } from "@/server/access";
import {
  addReading,
  assertVehicleInHousehold,
  createVehicle,
  deleteReading,
  deleteVehicle,
  listReadings,
  saveSchedule,
  updateVehicle,
} from "@/server/queries/vehicles";
import { removeStoredFiles } from "@/server/storage";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function rememberVehicle(vehicleId: string) {
  (await cookies()).set(VEHICLE_COOKIE, vehicleId, { httpOnly: true, sameSite: "lax", maxAge: ONE_YEAR, path: "/" });
}

export async function createVehicleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, householdId } = await requireMembership();
  const parsed = parseForm(newVehicleSchema, formData);
  if (!parsed.success) return parsed.state;
  if (parsed.data.trackedSince > todayInJakarta()) {
    return { fieldErrors: { trackedSince: "Can't be in the future" }, values: formValues(formData) };
  }
  const id = await createVehicle(householdId, user.id, parsed.data);
  await rememberVehicle(id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateVehicleAction(vehicleId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { householdId } = await requireMembership();
  const parsed = parseForm(vehicleDetailsSchema, formData);
  if (!parsed.success) return parsed.state;
  try {
    await updateVehicle(householdId, vehicleId, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return { message: "This car no longer exists." };
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Car details saved" };
}

export async function deleteVehicleAction(vehicleId: string) {
  const { householdId } = await requireMembership();
  const photoKeys = await deleteVehicle(householdId, vehicleId);
  await removeStoredFiles(photoKeys);
  (await cookies()).delete(VEHICLE_COOKIE);
  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function saveScheduleAction(
  vehicleId: string,
  items: unknown,
): Promise<{ ok: true } | { ok: false; message: string; itemErrors?: Record<number, string> }> {
  const { householdId } = await requireMembership();
  const parsed = scheduleSchema.safeParse(items);
  if (!parsed.success) {
    const itemErrors: Record<number, string> = {};
    for (const issue of parsed.error.issues) {
      const index = issue.path[0];
      if (typeof index === "number") itemErrors[index] ??= issue.message;
    }
    return { ok: false, message: "Some items need fixing.", itemErrors };
  }
  await saveSchedule(householdId, vehicleId, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true };
}

export type OdometerState = ActionState & { needsConfirm?: boolean };

export async function updateOdometerAction(_prev: OdometerState, formData: FormData): Promise<OdometerState> {
  const { user, householdId } = await requireMembership();
  const parsed = parseForm(odometerSchema, formData);
  if (!parsed.success) return parsed.state;
  const { vehicleId, km, confirm } = parsed.data;
  const today = todayInJakarta();

  const readings = await listReadings(householdId, vehicleId);
  const check = checkOdometer(readings, today, km);
  if (check !== "ok" && confirm !== "1") {
    const highest = Math.max(...readings.map((r) => r.km));
    return {
      needsConfirm: true,
      message: `That's lower than a previous reading (${formatKm(highest)}). Save it anyway?`,
      values: { km: String(km) },
    };
  }
  await addReading(householdId, vehicleId, user.id, { km, date: today });
  revalidatePath("/", "layout");
  return { ok: true, message: `Odometer updated to ${formatKm(km)}` };
}

export async function selectVehicleAction(vehicleId: string) {
  const { householdId } = await requireMembership();
  await assertVehicleInHousehold(householdId, vehicleId);
  await rememberVehicle(vehicleId);
  revalidatePath("/", "layout");
}

export async function deleteReadingAction(readingId: string): Promise<{ ok: boolean; error?: string }> {
  const { householdId } = await requireMembership();
  try {
    await deleteReading(householdId, readingId);
  } catch (e) {
    return { ok: false, error: e instanceof NotFoundError ? "That reading no longer exists." : (e as Error).message };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
