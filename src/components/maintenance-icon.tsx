import {
  BatteryChargingIcon,
  CircleDotIcon,
  DiscIcon,
  DropletIcon,
  FanIcon,
  FilterIcon,
  SparklesIcon,
  ThermometerIcon,
  WindIcon,
  WrenchIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RULES: [RegExp, LucideIcon][] = [
  [/oil filter|filter oli/i, FilterIcon],
  [/oil|oli/i, DropletIcon],
  [/cabin|ac\b|a\/c/i, FanIcon],
  [/air filter|filter udara/i, WindIcon],
  [/tire|tyre|ban|wheel|rotation|spooring|balanc/i, CircleDotIcon],
  [/brake|rem/i, DiscIcon],
  [/battery|aki|accu/i, BatteryChargingIcon],
  [/coolant|radiator|air radiator/i, ThermometerIcon],
  [/spark|busi/i, ZapIcon],
  [/wash|cuci|detail/i, SparklesIcon],
];

export function maintenanceIcon(name: string): LucideIcon {
  return RULES.find(([re]) => re.test(name))?.[1] ?? WrenchIcon;
}

/** Rounded tile with the item's icon, tinted by status. */
export function MaintenanceIcon({
  name,
  tone = "neutral",
  className,
}: {
  name: string;
  tone?: "neutral" | "overdue" | "due_soon" | "ok" | "primary";
  className?: string;
}) {
  const Icon = maintenanceIcon(name);
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    overdue: "bg-overdue/12 text-overdue",
    due_soon: "bg-due-soon/20 text-due-soon-foreground dark:text-due-soon",
    ok: "bg-ok/12 text-ok",
  } as const;
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", tones[tone], className)} aria-hidden>
      <Icon className="size-5" strokeWidth={2} />
    </span>
  );
}
