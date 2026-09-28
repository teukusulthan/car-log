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

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  const tab = ({ href, label, icon: Icon }: (typeof TABS)[number]) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-safe backdrop-blur-lg supports-[backdrop-filter]:bg-background/75"
    >
      <div className="mx-auto flex max-w-md items-stretch px-2">
        {left.map(tab)}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/log"
            aria-label="Log a service"
            className={cn(
              "-mt-5 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95",
              pathname === "/log" && "opacity-60",
            )}
          >
            <PlusIcon className="size-7" strokeWidth={2.25} aria-hidden />
          </Link>
        </div>
        {right.map(tab)}
      </div>
    </nav>
  );
}
