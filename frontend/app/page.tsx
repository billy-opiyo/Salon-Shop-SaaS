import Link from "next/link";

import { ExperienceSplash } from "@/components/shared/ExperienceSplash";

const plans = [
  {
    name: "Starter",
    description: "Launch a polished salon storefront with the essentials.",
    features: ["One salon store", "Core branding", "Services and gallery", "Booking foundation"],
  },
  {
    name: "Business",
    description: "Run daily salon operations with deeper customer workflows.",
    features: ["Advanced schedule", "Waitlist workflows", "Staff permissions", "Email and WhatsApp automation"],
  },
  {
    name: "Enterprise",
    description: "Scale multiple teams, locations, and operational requirements.",
    features: ["Advanced security", "Custom domains", "Expanded usage", "Priority onboarding"],
  },
] as const;

export default function PlatformHome() {
  return (
    <>
      <ExperienceSplash
        eyebrow="The salon operating platform"
        brandName="Salon Store Platform"
        description="Preparing your workspace experience"
      />
      <main>
        <header className="platform-header">
          <Link className="brand-mark" href="/" aria-label="Salon Store Platform home">
            <span className="brand-mark__dot" aria-hidden="true" />
            Salon Store Platform
          </Link>
          <nav className="platform-nav" aria-label="Platform navigation">
            <Link href="#plans">Plans</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link className="button button--small button--outline" href="/royal-braids">
              View demo store
            </Link>
          </nav>
        </header>

        <section className="platform-hero" aria-labelledby="platform-title">
          <div className="platform-hero__copy">
            <p className="eyebrow">One platform. Every salon experience.</p>
            <h1 id="platform-title">Create a beautiful salon store that works as hard as you do.</h1>
            <p className="platform-hero__description">
              Give your salon its own branded website, booking flow, customer dashboard, and management workspace—without rebuilding the system from scratch.
            </p>
            <div className="platform-hero__actions">
              <Link className="button button--primary" href="/onboarding">
                Create your salon store
              </Link>
              <Link className="button button--ghost" href="#plans">
                Explore plans <span aria-hidden="true">↓</span>
              </Link>
            </div>
            <p className="platform-hero__note">Built for independent salon owners and growing teams.</p>
          </div>
          <div className="platform-hero__panel" aria-label="Platform preview">
            <div className="preview-window__topbar" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="preview-window__body">
              <p className="eyebrow">Your salon workspace</p>
              <h2>Beautiful on the outside. Organized underneath.</h2>
              <div className="preview-stat-grid">
                <div><strong>24</strong><span>Bookings</span></div>
                <div><strong>08</strong><span>Services</span></div>
                <div><strong>96%</strong><span>Happy clients</span></div>
              </div>
              <div className="preview-window__line preview-window__line--wide" />
              <div className="preview-window__line" />
              <div className="preview-window__line preview-window__line--short" />
            </div>
          </div>
        </section>

        <section className="platform-section" id="how-it-works" aria-labelledby="how-title">
          <div className="section-heading">
            <p className="eyebrow">A calmer way to run your business</p>
            <h2 id="how-title">From first click to fully booked.</h2>
          </div>
          <div className="steps-grid">
            <article><span>01</span><h3>Create</h3><p>Set up your salon identity, services, team, and public store address.</p></article>
            <article><span>02</span><h3>Customize</h3><p>Bring your brand to life with the preserved salon storefront experience.</p></article>
            <article><span>03</span><h3>Grow</h3><p>Manage bookings, content, customers, and daily operations from one workspace.</p></article>
          </div>
        </section>

        <section className="platform-section platform-section--plans" id="plans" aria-labelledby="plans-title">
          <div className="section-heading">
            <p className="eyebrow">Choose your operating level</p>
            <h2 id="plans-title">Plans that grow with your salon.</h2>
            <p>Pricing and final limits will be confirmed before billing is implemented.</p>
          </div>
          <div className="plans-grid">
            {plans.map((plan) => (
              <article className={`plan-card${plan.name === "Business" ? " plan-card--featured" : ""}`} key={plan.name}>
                {plan.name === "Business" && <span className="plan-card__badge">Recommended</span>}
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <ul>{plan.features.map((feature) => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
                <Link className="button button--outline" href="/onboarding">Start with {plan.name}</Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
