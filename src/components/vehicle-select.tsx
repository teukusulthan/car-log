"use client";

import { useTransition } from "react";
import { selectVehicleAction } from "@/server/actions/vehicles";

/** Invisible native <select> stretched over the header, so a tap opens the system picker. */
export function VehicleSelect({ vehicles, currentId }: { vehicles: { id: string; name: string }[]; currentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Switch car"
      value={currentId}
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        startTransition(() => selectVehicleAction(id));
      }}
      className="absolute inset-0 size-full cursor-pointer opacity-0"
    >
      {vehicles.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
