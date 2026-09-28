import type { ReactNode } from "react";

export function SectionHeader({
  id,
  title,
  description,
  count,
  action,
}: {
  id?: string;
  title: string;
  description?: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-lg font-semibold">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background tabular-nums">{count}</span>
          )}
        </h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
