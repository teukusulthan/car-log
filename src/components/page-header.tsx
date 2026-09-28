import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Title bar for inner screens, with an optional back link and trailing action. */
export function PageHeader({ title, back, action, subtitle }: { title: string; back?: string; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex items-center gap-1 pt-2 pb-4">
      {back && (
        <Button asChild variant="ghost" size="icon" className="-ml-3 shrink-0">
          <Link href={back} aria-label="Back">
            <ChevronLeftIcon className="size-6" />
          </Link>
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
