import Link from "next/link";

export default function OnboardingPage() {
  return (
    <main className="onboarding-page">
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <p className="eyebrow">Store creation foundation</p>
        <h1 id="onboarding-title">Your salon workspace starts here.</h1>
        <p>
          Account creation, plan selection, and tenant provisioning will be
          connected after the authentication and Prisma foundation is approved.
        </p>
        <div className="platform-hero__actions">
          <Link className="button button--primary" href="/">
            Back to platform home
          </Link>
          <Link className="button button--ghost" href="/royal-braids">
            View the demo store
          </Link>
        </div>
      </section>
    </main>
  );
}
