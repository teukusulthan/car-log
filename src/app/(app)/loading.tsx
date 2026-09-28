import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the screen layout (header, hero, cards) so content doesn't jump when it arrives. */
export default function Loading() {
  return (
    <div className="grid gap-7 pt-4" aria-busy="true" aria-label="Loading">
      <div className="grid gap-2">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-8 w-56 rounded-xl" />
      </div>
      <Skeleton className="h-56 w-full rounded-[28px]" />
      <Skeleton className="h-40 w-full rounded-[28px]" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-32 rounded-3xl" />
      </div>
    </div>
  );
}
