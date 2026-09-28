import { cn } from "@/lib/utils";

type Tone = "overdue" | "due_soon" | "ok";

/** Thin bar showing how much of the service interval is used up. */
export function DueProgress({ value, tone, index = 0, className }: { value: number; tone: Tone; index?: number; className?: string }) {
  const pct = Math.min(1, Math.max(0.03, value));
  const color = tone === "overdue" ? "bg-overdue" : tone === "due_soon" ? "bg-due-soon" : "bg-ok";
  return (
    <div
      role="progressbar"
      aria-label="Interval used"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(value, 1) * 100)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div className={cn("grow-x h-full rounded-full", color)} style={{ width: `${pct * 100}%`, ["--i" as string]: index }} />
    </div>
  );
}
