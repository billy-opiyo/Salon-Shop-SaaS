import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

import { StoreSetupForm } from "./StoreSetupForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <main className="onboarding-page">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="eyebrow">Store creation foundation</p>
        <h1 id="onboarding-title">Your salon workspace starts here.</h1>
        <p>Choose a plan and reserve your salon store address. Your workspace and default service categories will be created together.</p>
        <StoreSetupForm />
        <div className="platform-hero__actions">
          <Link className="button button--ghost" href="/">Back to platform home</Link>
          <Link className="button button--ghost" href="/royal-braids">View the Royal Braids store</Link>
        </div>
      </section>
    </main>
  );
}
