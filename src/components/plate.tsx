import { cn } from "@/lib/utils";

/** Indonesian-style number plate chip. */
export function Plate({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-[5px] border border-white/25 bg-neutral-950 px-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]",
        className,
      )}
    >
      {value}
    </span>
  );
}
