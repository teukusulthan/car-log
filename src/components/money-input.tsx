"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const group = (digits: string) => (digits ? Number(digits).toLocaleString("id-ID") : "");

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (digits: string) => void;
};

/** Rupiah input that shows "1.250.000" while typing and reports the raw digits. */
export function MoneyInput({ value, onValueChange, className, ...props }: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">Rp</span>
      <Input
        {...props}
        inputMode="numeric"
        autoComplete="off"
        value={group(value)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
        className={cn("pl-10 tabular-nums", className)}
      />
    </div>
  );
}
