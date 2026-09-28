import { toCsv } from "@/lib/csv";
import { todayInJakarta } from "@/lib/dates";
import { getSessionUser } from "@/server/access";
import { getMembership } from "@/server/access-core";
import { exportServices } from "@/server/queries/services";

/** CSV of every service in the signed-in user's household. */
export async function GET() {
  const user = await getSessionUser();
  const membership = user && (await getMembership(user.id));
  if (!membership) return new Response("Unauthorized", { status: 401 });

  const rows = await exportServices(membership.householdId);
  const csv = toCsv(
    ["Date", "Car", "Plate", "Odometer (km)", "Workshop", "Work done", "Total (IDR)", "Notes"],
    rows.map((r) => [r.date, r.vehicle, r.plate, r.odometer, r.workshop, r.items, r.totalCost, r.notes]),
  );
  // BOM so Excel opens UTF-8 correctly.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="car-log-services-${todayInJakarta()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
