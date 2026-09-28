import Image from "next/image";
import type { ReactNode } from "react";

/** Branded layout for sign-in, sign-up, onboarding and invite screens. */
export function AuthShell({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-safe">
      <div className="relative isolate overflow-hidden rounded-b-[36px] bg-hero-gradient px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-10 text-hero-foreground">
        <div aria-hidden className="absolute -top-20 -right-10 -z-10 size-64 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="absolute -bottom-24 -left-16 -z-10 size-64 rounded-full bg-black/20 blur-3xl" />
        <div className="rise-in flex items-center gap-2.5 pt-6">
          <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-[10px] ring-1 ring-white/30" priority />
          <span className="text-lg font-semibold tracking-tight">car-log</span>
        </div>
        <p className="rise-in mt-10 max-w-[18ch] text-[30px] leading-[1.1] font-semibold tracking-tight" style={{ ["--i" as string]: 1 }}>
          Every service, every renewal, remembered.
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-7 px-6 pt-8 pb-10">
        <div className="rise-in grid gap-1.5" style={{ ["--i" as string]: 2 }}>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-[15px] text-muted-foreground">{description}</p>
        </div>
        <div className="rise-in" style={{ ["--i" as string]: 3 }}>
          {children}
        </div>
      </div>
    </main>
  );
}
