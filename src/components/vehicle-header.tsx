import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { VehicleSelect } from "@/components/vehicle-select";

type Vehicle = { id: string; name: string; make: string; model: string; plate: string | null };

/** Screen title showing the current car; tapping it opens the iOS picker when there are several cars. */
export function VehicleHeader({
  eyebrow,
  vehicles,
  current,
  action,
}: {
  eyebrow: string;
  vehicles: Vehicle[];
  current: Vehicle;
  action?: ReactNode;
}) {
  const multiple = vehicles.length > 1;
  const showModel = current.name.trim().toLowerCase() !== `${current.make} ${current.model}`.trim().toLowerCase();
  return (
    <header className="flex items-start gap-3 pt-3 pb-4">
      <div className="relative min-w-0 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <h1 className="flex items-center gap-1 text-2xl font-semibold tracking-tight">
          <span className="truncate">{current.name}</span>
          {multiple && <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
        </h1>
        {(showModel || current.plate) && (
          <p className="flex items-center gap-2 truncate text-sm text-muted-foreground">
            {showModel && `${current.make} ${current.model}`}
            {current.plate && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{current.plate}</span>}
          </p>
        )}
        {multiple && <VehicleSelect vehicles={vehicles} currentId={current.id} />}
      </div>
      {action}
    </header>
  );
}
