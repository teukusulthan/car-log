import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { JoinHouseholdForm } from "@/components/join-household-form";
import { Button } from "@/components/ui/button";
import { getMembership, getSessionUser } from "@/server/access";
import { getInvitePreview } from "@/server/queries/households";

export const metadata: Metadata = { title: "Join a garage" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [invite, user] = await Promise.all([getInvitePreview(token), getSessionUser()]);

  if (!invite || invite.status !== "valid") {
    const reason = !invite ? "isn't valid" : invite.status === "used" ? "has already been used" : "has expired";
    return (
      <AuthShell title="Invite unavailable" description={`This invite link ${reason}. Ask whoever invited you to send a new one.`}>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Go to car-log</Link>
        </Button>
      </AuthShell>
    );
  }

  const title = `Join “${invite.householdName}”`;
  if (!user) {
    return (
      <AuthShell title={title} description="You've been invited to share car maintenance records. Create an account or log in to accept.">
        <div className="grid gap-3">
          <Button asChild size="lg">
            <Link href={`/signup?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>Create account to join</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}>I already have an account</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  const membership = await getMembership(user.id);
  if (membership) {
    const same = membership.householdId === invite.householdId;
    return (
      <AuthShell
        title={same ? "You're already in" : "Already in a garage"}
        description={
          same
            ? `You're already a member of “${invite.householdName}”.`
            : "Your account already belongs to another garage. Each account can be in one garage at a time."
        }
      >
        <Button asChild size="lg">
          <Link href="/">Open car-log</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={title} description={`Signed in as ${user.email}. You'll see and edit the same cars and service history.`}>
      <JoinHouseholdForm token={token} defaultName={user.name ?? ""} />
    </AuthShell>
  );
}
