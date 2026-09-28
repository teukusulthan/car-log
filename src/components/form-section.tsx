import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A titled card that groups related fields in a long form. */
export function FormSection({
  title,
  icon: Icon,
  description,
  children,
  className,
  index = 0,
}: {
  title: string;
  icon?: LucideIcon;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <fieldset className={cn("rise-in grid gap-4 rounded-[26px] bg-card p-4 shadow-soft", className)} style={{ ["--i" as string]: index }}>
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-2.5" aria-hidden>
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <p className="font-semibold">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  );
}
