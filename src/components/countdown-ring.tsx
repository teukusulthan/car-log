import { cn } from "@/lib/utils";

/** Circular countdown: the ring shows how much of the validity period is left. */
export function CountdownRing({ daysLeft, periodDays, tone }: { daysLeft: number; periodDays: number; tone: "expired" | "due_soon" | "ok" }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const left = Math.min(1, Math.max(0, daysLeft / periodDays));
  const color = tone === "expired" ? "text-overdue" : tone === "due_soon" ? "text-due-soon" : "text-ok";
  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - left)}
          className={cn(color, "transition-[stroke-dashoffset] duration-700")}
          style={{ animation: "ring-in 900ms var(--ease-out-soft) both" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-3xl leading-none font-semibold tabular-nums">{Math.abs(daysLeft)}</span>
        <span className="mt-0.5 text-[11px] font-medium text-muted-foreground">{daysLeft < 0 ? "days ago" : daysLeft === 1 ? "day left" : "days left"}</span>
      </div>
    </div>
  );
}
