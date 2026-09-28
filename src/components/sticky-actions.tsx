import type { ReactNode } from "react";

/** Save bar pinned above the home indicator; lives inside the <form> so its submit button submits it. */
export function StickyActions({ children, summary }: { children: ReactNode; summary?: ReactNode }) {
  return (
    <>
      {/* Spacer so the last field can scroll above the bar. */}
      <div aria-hidden className="h-24" />
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-[26px] bg-card/90 p-2 pl-4 shadow-lift ring-1 ring-border backdrop-blur-xl">
          {summary && <div className="min-w-0 flex-1">{summary}</div>}
          <div className={summary ? "shrink-0" : "flex-1"}>{children}</div>
        </div>
      </div>
    </>
  );
}
