import { BottomNav } from "@/components/bottom-nav";
import { Suspense } from "react";
import { OfflineBanner } from "@/components/offline-banner";
import { OfflinePageCache } from "@/components/offline-page-cache";
import { requireMembership } from "@/server/access";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireMembership();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <OfflineBanner />
      <main className="flex-1 px-5 pt-safe pb-[calc(env(safe-area-inset-bottom)+7.5rem)]">{children}</main>
      <BottomNav />
      <Suspense>
        <OfflinePageCache />
      </Suspense>
    </div>
  );
}
