"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeMemberAction } from "@/server/actions/household";

type Member = { userId: string; email: string | null; name: string | null; role: "owner" | "member" };

export function MemberList({ members, currentUserId, canManage }: { members: Member[]; currentUserId: string; canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <ul className="divide-y divide-border/70">
      {members.map((m) => (
        <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary/12 text-sm font-semibold text-primary">
            {(m.name || m.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {m.name || m.email}
              {m.userId === currentUserId && <span className="text-muted-foreground"> (you)</span>}
            </p>
            <p className="truncate text-sm text-muted-foreground">{m.role === "owner" ? "Owner" : "Member"} · {m.email}</p>
          </div>
          {canManage && m.role !== "owner" && (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (!window.confirm(`Remove ${m.name || m.email} from this garage?`)) return;
                  const res = await removeMemberAction(m.userId);
                  if (res.error) toast.error(res.error);
                  else toast.success("Member removed");
                })
              }
            >
              Remove
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
