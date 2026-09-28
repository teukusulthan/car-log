"use client";

import { FileTextIcon, HistoryIcon, HouseIcon, PlusIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: HouseIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/documents", label: "Documents", icon: FileTextIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

/** Screens with their own sticky save bar hide the dock to give the form room. */
const FORM_ROUTES = [/^\/log$/, /^\/history\/[^/]+\/edit$/, /^\/documents\/new$/, /^\/vehicles\/new$/];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  if (FORM_ROUTES.some((r) => r.test(pathname))) return null;
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  const tab = ({ href, label, icon: Icon }: (typeof TABS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className="pressable group flex h-full flex-1 flex-col items-center justify-center gap-0.5"
      >
        <span
          className={cn(
            "flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200",
            active ? "bg-primary/12 text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
        </span>
        <span className={cn("text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
      <div className="pointer-events-auto mx-auto flex h-[68px] max-w-md items-center rounded-[28px] bg-card/85 px-1.5 shadow-lift ring-1 ring-border backdrop-blur-xl">
        {left.map(tab)}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/log"
            aria-label="Log a service"
            className="pressable flex size-[52px] items-center justify-center rounded-[20px] bg-primary text-primary-foreground shadow-[0_8px_20px_-6px] shadow-primary/60"
          >
            <PlusIcon className="size-7" strokeWidth={2.4} aria-hidden />
          </Link>
        </div>
        {right.map(tab)}
      </div>
    </nav>
  );
}
