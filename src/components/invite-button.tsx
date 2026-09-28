"use client";

import { UserPlusIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createInviteAction } from "@/server/actions/household";

/** Creates a single-use invite link and opens the iOS share sheet (falls back to copying it). */
export function InviteButton({ householdName }: { householdName: string }) {
  const [pending, startTransition] = useTransition();
  const invite = () =>
    startTransition(async () => {
      const res = await createInviteAction();
      if ("error" in res) return void toast.error(res.error);
      const url = `${window.location.origin}/invite/${res.token}`;
      const text = `Join “${householdName}” on car-log to share our car's service history.`;
      try {
        if (navigator.share) {
          await navigator.share({ title: "car-log invite", text, url });
          return;
        }
        await navigator.clipboard.writeText(url);
        toast.success("Invite link copied. It works once and expires in 7 days.");
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // user closed the share sheet
        toast.message("Share this link", { description: url, duration: 20000 });
      }
    });
  return (
    <Button variant="secondary" className="w-full rounded-2xl" onClick={invite} disabled={pending}>
      <UserPlusIcon /> {pending ? "Creating link…" : "Invite family member"}
    </Button>
  );
}
