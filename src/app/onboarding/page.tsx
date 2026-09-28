import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { OnboardingForm } from "@/components/onboarding-form";
import { getMembership, requireUser } from "@/server/access";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/");
  return (
    <AuthShell
      title="Welcome to car-log"
      description="Set up your garage. You can invite your family to it later so everyone sees the same history."
    >
      <OnboardingForm defaultName={user.name ?? ""} />
    </AuthShell>
  );
}
