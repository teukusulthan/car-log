import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-semibold text-muted-foreground">404</p>
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">Not found</h1>
        <p className="text-muted-foreground">This page doesn&apos;t exist, or it belongs to another garage.</p>
      </div>
      <Button asChild size="lg">
        <Link href="/">Go home</Link>
      </Button>
    </main>
  );
}
