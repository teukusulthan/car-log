import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Title bar for inner screens, with an optional back link and trailing action. */
export function PageHeader({ title, back, action, subtitle }: { title: string; back?: string; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="rise-in grid gap-4 pt-4 pb-5">
      {(back || action) && (
        <div className="flex items-center justify-between">
          {back ? (
            <Link
              href={back}
              aria-label="Back"
              className="pressable flex size-11 items-center justify-center rounded-full bg-card shadow-soft ring-1 ring-border"
            >
              <ChevronLeftIcon className="size-5" />
            </Link>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      <div className="min-w-0 px-1">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[15px] text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}
