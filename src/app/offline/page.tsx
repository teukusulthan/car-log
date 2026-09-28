import { WifiOffIcon } from "lucide-react";
import type { Metadata } from "next";
import { RetryButton } from "@/components/retry-button";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOffIcon className="size-10 text-muted-foreground" aria-hidden />
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground">This page hasn&apos;t been saved for offline use yet. Reconnect and try again.</p>
      </div>
      <RetryButton />
    </main>
  );
}
