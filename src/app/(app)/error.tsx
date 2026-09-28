"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <TriangleAlertIcon className="size-10 text-due-soon" aria-hidden />
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{offline ? "You're offline" : "Something went wrong"}</h1>
        <p className="text-muted-foreground">
          {offline ? "Reconnect to load this screen." : "Your data is safe. Please try again."}
        </p>
      </div>
      <Button size="lg" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
