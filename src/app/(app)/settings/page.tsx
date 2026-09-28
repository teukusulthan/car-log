import { CarFrontIcon, ChevronRightIcon, DownloadIcon, KeyRoundIcon, PlusIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/change-password-form";
import { HouseholdNameForm } from "@/components/household-name-form";
import { InviteButton } from "@/components/invite-button";
import { MemberList } from "@/components/member-list";
import { NotificationSettings } from "@/components/notification-settings";
import { PageHeader } from "@/components/page-header";
import { SettingsGroup, SettingsIcon, SettingsRow } from "@/components/settings-list";
import { SignOutButton } from "@/components/sign-out-button";
import { requireMembership } from "@/server/access";
import { getHousehold, listMembers } from "@/server/queries/households";
import { listVehicles } from "@/server/queries/vehicles";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, householdId, role } = await requireMembership();
  const [household, members, vehicles] = await Promise.all([
    getHousehold(householdId),
    listMembers(householdId),
    listVehicles(householdId),
  ]);
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <div className="grid gap-7">
      <PageHeader title="Settings" />

      <section className="rise-in flex items-center gap-4 rounded-[26px] bg-card p-4 shadow-soft">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-primary text-xl font-semibold text-primary-foreground">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{user.name ?? "You"}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          <p className="truncate text-sm text-muted-foreground">
            {role === "owner" ? "Owner" : "Member"} of {household?.name ?? "your garage"}
          </p>
        </div>
      </section>

      <SettingsGroup title="Cars" index={1} footer="Open a car to edit its details, service schedule and odometer readings.">
        {vehicles.map((v) => (
          <SettingsRow
            key={v.id}
            icon={CarFrontIcon}
            label={v.name}
            detail={[v.make, v.model, v.year, v.plate].filter(Boolean).join(" · ")}
            href={`/vehicles/${v.id}`}
          />
        ))}
        <SettingsRow icon={PlusIcon} tone="gray" label="Add a car" href="/vehicles/new" />
      </SettingsGroup>

      <SettingsGroup title="Reminders" index={2} footer="Reminders are set up per device — turn them on for each phone.">
        <div className="p-4">
          <NotificationSettings />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Garage" index={3} footer="Everyone in your garage sees and edits the same cars. Invite links work once and expire in 7 days.">
        {role === "owner" && household && (
          <div className="flex items-center gap-3 px-4 py-3">
            <SettingsIcon icon={UsersIcon} tone="green" />
            <div className="flex-1">
              <HouseholdNameForm name={household.name} />
            </div>
          </div>
        )}
        <MemberList members={members} currentUserId={user.id} canManage={role === "owner"} />
        <div className="p-3">
          <InviteButton householdName={household?.name ?? "our garage"} />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Account" index={4}>
        <details className="group">
          <summary className="pressable flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2.5 active:bg-muted/60 [&::-webkit-details-marker]:hidden">
            <SettingsIcon icon={KeyRoundIcon} tone="amber" />
            <span className="flex-1 font-medium">Change password</span>
            <ChevronRightIcon className="size-4 text-muted-foreground/60 transition-transform duration-200 group-open:rotate-90" aria-hidden />
          </summary>
          <div className="px-4 pb-4">
            <ChangePasswordForm />
          </div>
        </details>
        <SettingsRow icon={DownloadIcon} tone="gray" label="Export service history" detail="CSV for Excel or Google Sheets" href="/api/export" download />
      </SettingsGroup>

      <div className="rise-in" style={{ ["--i" as string]: 5 }}>
        <SignOutButton />
      </div>
    </div>
  );
}
