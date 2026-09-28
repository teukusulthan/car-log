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

const ICONS = {
  oilFilter: FilterIcon,
  oil: DropletIcon,
  cabin: FanIcon,
  air: WindIcon,
  tire: CircleDotIcon,
  brake: DiscIcon,
  battery: BatteryChargingIcon,
  coolant: ThermometerIcon,
  spark: ZapIcon,
  wash: SparklesIcon,
  other: WrenchIcon,
} satisfies Record<string, LucideIcon>;

const RULES: [RegExp, keyof typeof ICONS][] = [
  [/oil filter|filter oli/i, "oilFilter"],
  [/oil|oli/i, "oil"],
  [/cabin|ac\b|a\/c/i, "cabin"],
  [/air filter|filter udara/i, "air"],
  [/tire|tyre|ban|wheel|rotation|spooring|balanc/i, "tire"],
  [/brake|rem/i, "brake"],
  [/battery|aki|accu/i, "battery"],
  [/coolant|radiator/i, "coolant"],
  [/spark|busi/i, "spark"],
  [/wash|cuci|detail/i, "wash"],
];

export function maintenanceIconKey(name: string): keyof typeof ICONS {
  return RULES.find(([re]) => re.test(name))?.[1] ?? "other";
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
  const Icon = ICONS[maintenanceIconKey(name)];
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
