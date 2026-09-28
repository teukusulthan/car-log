import { CarFrontIcon } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe">
      <div className="flex flex-1 flex-col justify-center gap-8 py-10">
        <div className="grid gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <CarFrontIcon className="size-6" aria-hidden />
          </div>
          <div className="grid gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
