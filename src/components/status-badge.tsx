import { cn } from "@/lib/utils";

export type Tone = "overdue" | "due_soon" | "ok" | "expired";

const TONES: Record<Tone, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-overdue/12 text-overdue" },
  expired: { label: "Expired", className: "bg-overdue/12 text-overdue" },
  due_soon: { label: "Due soon", className: "bg-due-soon/25 text-due-soon-foreground dark:text-due-soon" },
  ok: { label: "OK", className: "bg-ok/15 text-ok" },
};

export function StatusBadge({ tone, className }: { tone: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center rounded-md px-1.5 text-[11px] font-semibold tracking-wide uppercase", t.className, className)}>
      {t.label}
    </span>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  const color = tone === "ok" ? "bg-ok" : tone === "due_soon" ? "bg-due-soon" : "bg-overdue";
  return <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", color)} />;
}
