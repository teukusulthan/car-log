import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** iOS-style grouped list with a small caption above it. */
export function SettingsGroup({ title, footer, children, index = 0 }: { title?: string; footer?: ReactNode; children: ReactNode; index?: number }) {
  return (
    <section className="rise-in grid gap-2" style={{ ["--i" as string]: index }}>
      {title && <h2 className="px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>}
      <div className="divide-y divide-border/70 overflow-hidden rounded-[22px] bg-card shadow-soft">{children}</div>
      {footer && <p className="px-4 text-xs text-muted-foreground">{footer}</p>}
    </section>
  );
}

const ICON_TONES = {
  blue: "bg-primary text-primary-foreground",
  green: "bg-ok text-ok-foreground",
  amber: "bg-due-soon text-due-soon-foreground",
  red: "bg-overdue text-overdue-foreground",
  gray: "bg-muted-foreground text-background",
} as const;

export function SettingsIcon({ icon: Icon, tone = "blue" }: { icon: LucideIcon; tone?: keyof typeof ICON_TONES }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px]", ICON_TONES[tone])} aria-hidden>
      <Icon className="size-[18px]" />
    </span>
  );
}

type RowProps = {
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONES;
  label: ReactNode;
  detail?: ReactNode;
  href?: string;
  download?: boolean;
  trailing?: ReactNode;
};

/** A tappable settings row (link) or a static one. */
export function SettingsRow({ icon, tone, label, detail, href, download, trailing }: RowProps) {
  const content = (
    <>
      <SettingsIcon icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{label}</p>
        {detail && <p className="truncate text-sm text-muted-foreground">{detail}</p>}
      </div>
      {trailing ?? (href && <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />)}
    </>
  );
  const className = "flex min-h-14 items-center gap-3 px-4 py-2.5";
  if (!href) return <div className={className}>{content}</div>;
  return download ? (
    <a href={href} download className={cn(className, "pressable active:bg-muted/60")}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cn(className, "pressable active:bg-muted/60")}>
      {content}
    </Link>
  );
}
