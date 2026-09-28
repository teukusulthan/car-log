import { ChevronRightIcon, DownloadIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ChangePasswordForm } from "@/components/change-password-form";
import { HouseholdNameForm } from "@/components/household-name-form";
import { InviteButton } from "@/components/invite-button";
import { MemberList } from "@/components/member-list";
import { NotificationSettings } from "@/components/notification-settings";
import { PageHeader } from "@/components/page-header";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { requireMembership } from "@/server/access";
import { getHousehold, listMembers } from "@/server/queries/households";
import { listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const { user, householdId, role } = await requireMembership();
  const [household, members, vehicles] = await Promise.all([
    getHousehold(householdId),
    listMembers(householdId),
    listVehicles(householdId),
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader title="Settings" subtitle={user.email} />

      <Section title="Cars">
        {vehicles.length > 0 && (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {vehicles.map((v) => (
              <li key={v.id}>
                <Link href={`/vehicles/${v.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-muted">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {[v.make, v.model, v.year, v.plate].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">Details & schedule</span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="outline">
          <Link href="/vehicles/new">
            <PlusIcon /> Add a car
          </Link>
        </Button>
      </Section>

      <Section title="Notifications" description="Reminders are set up per device.">
        <NotificationSettings />
      </Section>

      <Section title="Garage" description="Everyone in your garage sees and edits the same cars.">
        {role === "owner" && household && <HouseholdNameForm name={household.name} />}
        <MemberList members={members} currentUserId={user.id} canManage={role === "owner"} />
        <InviteButton householdName={household?.name ?? "our garage"} />
      </Section>

      <Section title="Your data">
        <Button asChild variant="outline">
          <a href="/api/export" download>
            <DownloadIcon /> Export service history (CSV)
          </a>
        </Button>
      </Section>

      <Section title="Password">
        <ChangePasswordForm />
      </Section>

      <Section title="Account">
        <SignOutButton />
      </Section>
    </div>
  );
}
