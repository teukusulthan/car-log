import { ChevronDownIcon } from "lucide-react";
import { VehicleSelect } from "@/components/vehicle-select";

/** Screen subtitle naming the current car; tapping it opens the system picker when there are several. */
export function CarSwitchTitle({ vehicles, currentId }: { vehicles: { id: string; name: string }[]; currentId: string }) {
  const current = vehicles.find((v) => v.id === currentId);
  if (!current) return null;
  if (vehicles.length < 2) return <>{current.name}</>;
  return (
    <span className="relative inline-flex items-center gap-1 font-medium text-foreground">
      {current.name}
      <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden />
      <VehicleSelect vehicles={vehicles} currentId={currentId} />
    </span>
  );
}
