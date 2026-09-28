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
      title={user.name ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome to car-log"}
      description="First, set up your garage. Next you'll add your car."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
