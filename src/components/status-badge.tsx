import { cn } from "@/lib/utils";

export type Tone = "overdue" | "due_soon" | "ok" | "expired";

const TONES: Record<Tone, { label: string; className: string }> = {
  overdue: { label: "Overdue", className: "bg-overdue text-overdue-foreground" },
  expired: { label: "Expired", className: "bg-overdue text-overdue-foreground" },
  due_soon: { label: "Due soon", className: "bg-due-soon text-due-soon-foreground" },
  ok: { label: "OK", className: "bg-ok/15 text-ok" },
};

export function StatusBadge({ tone, className }: { tone: Tone; className?: string }) {
  const t = TONES[tone];
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2 text-xs font-semibold", t.className, className)}>
      {t.label}
    </span>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  const color = tone === "ok" ? "bg-ok" : tone === "due_soon" ? "bg-due-soon" : "bg-overdue";
  return <span aria-hidden className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", color)} />;
}
