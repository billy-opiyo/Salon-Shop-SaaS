import Link from "next/link"
import Image from "next/image"
import { headers } from "next/headers"

import { getRequestHost } from "@backend/services/tenantDomainService"
import { getTenantStorefrontByHost } from "@backend/services/tenantDirectory"
import { renderTenantStorefront } from "@/app/[tenantSlug]/page"

import { ExperienceSplash } from "@/components/shared/ExperienceSplash"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { TopStoresGrid } from "@/components/shared/TopStoresGrid"
import { ContactForm } from "@/components/shared/ContactForm"
import {
	PLAN_ENTITLEMENTS,
	PLAN_POSITIONING,
	PLAN_PRICING,
} from "@shared/constants/plans"

type PlatformIconName = "home" | "store" | "plans" | "create" | "contact"

function PlatformIcon({ name }: { readonly name: PlatformIconName }) {
	return (
		<svg
			className="mobile-action-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			{name === "home" && (
				<>
					<path d="m3 10 9-7 9 7" />
					<path d="M5 9.5V21h14V9.5" />
					<path d="M9 21v-6h6v6" />
				</>
			)}
			{name === "store" && (
				<>
					<path d="M4 10h16v10H4z" />
					<path d="M3 10 5 4h14l2 6" />
					<path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
					<path d="M8 20v-5h8v5" />
				</>
			)}
			{name === "plans" && (
				<>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<path d="M3 10h18" />
					<path d="M7 15h3" />
				</>
			)}
			{name === "contact" && (
				<>
					<rect x="3" y="5" width="18" height="14" rx="2" />
					<path d="m3 7 9 6 9-6" />
				</>
			)}
			{name === "create" && (
				<>
					<rect x="4" y="4" width="16" height="16" rx="3" />
					<path d="M12 8v8M8 12h8" />
				</>
			)}
		</svg>
	)
}

const plans = [
	{
		name: "Starter",
		tier: "starter",
		description: "Launch a polished salon storefront with the essentials.",
		features: [
			"Launch one polished salon storefront",
			"Manage services, gallery, blog, and reviews",
			"Handle up to 100 bookings each month",
			"Owner-led workspace with standard support",
		],
	},
	{
		name: "Business",
		tier: "business",
		description: "Run daily salon operations with deeper customer workflows.",
		features: [
			"Run up to 1,000 bookings each month",
			"Manage up to 10 staff members with permissions",
			"Use waitlists and advanced scheduling",
			"Automate email and WhatsApp follow-up",
		],
	},
	{
		name: "Enterprise",
		tier: "enterprise",
		description:
			"Scale multiple teams, locations, and operational requirements.",
		features: [
			"Operate multiple salon locations",
			"Use expanded or negotiated usage limits",
			"Apply advanced security and audit controls",
			"Receive custom-domain and priority onboarding support",
		],
	},
] as const

export default async function PlatformHome() {
	const requestHost = getRequestHost(await headers())
	if (requestHost) {
		const customTenant = await getTenantStorefrontByHost(requestHost)
		if (customTenant) return renderTenantStorefront(customTenant.slug)
	}
	return (
		<>
			<ExperienceSplash
				eyebrow="The salon operating platform"
				brandName="Beauty Sphia"
				description="Preparing your workspace experience"
			/>
			<main id="home" className="platform-home-shell">
				<PlatformHeader page="home" />

				<section
					className="platform-hero platform-hero--image"
					aria-labelledby="platform-title"
				>
					<picture className="platform-hero__picture">
						<source
							media="(max-width: 1024px)"
							srcSet="/platform/hero-mobile-beauty-sphia-copy.png"
						/>
						<Image
							className="platform-hero__image"
							src="/platform/hero-desktop-beauty-sphia-copy.png"
							alt="Beauty Sphia salon management platform"
							width={1536}
							height={880}
							priority
							sizes="100vw"
						/>
					</picture>
					<h1 id="platform-title" className="sr-only">
						Beauty Sphia salon management platform
					</h1>
				</section>

				<section
					className="platform-section platform-showcase"
					aria-labelledby="showcase-title"
				>
					<p className="eyebrow">A calmer way to run your business</p>
					<div className="showcase-copy">
						<h2 id="showcase-title">
							Where every salon finds its people — and every crown finds its
							craft.
						</h2>
						<p>
							From glossy knotless braids to evenings that glow, the talent on
							Beauty Sphia turns appointments into rituals and clients into
							regulars. Step into a directory of independent salons, each one
							ready to welcome you the moment you arrive.
						</p>
						<div className="platform-hero__actions">
							<Link className="button button--primary" href="/stores">
								Explore Stores
							</Link>
							<Link className="button button--ghost" href="/#plans">
								See plans
							</Link>
						</div>
					</div>
				</section>

				<section
					className="platform-section"
					id="top-stores"
					aria-labelledby="top-stores-title"
				>
					<div className="section-heading section-heading--row">
						<div>
							<p className="eyebrow">Top Stores Available</p>
							<h2 id="top-stores-title">
								Step inside a live salon experience.
							</h2>
						</div>
						<Link className="button button--outline" href="/stores">
							View all stores
						</Link>
					</div>
					<TopStoresGrid />
				</section>

				<section
					className="platform-section"
					id="how-it-works"
					aria-labelledby="how-title"
				>
					<div className="section-heading">
						<p className="eyebrow">A calmer way to run your business</p>
						<h2 id="how-title">From first click to fully booked.</h2>
					</div>
					<div className="steps-grid">
						<article>
							<span>01</span>
							<h3>Create</h3>
							<p>
								Set up your salon identity, services, team, and public store
								address.
							</p>
						</article>
						<article>
							<span>02</span>
							<h3>Customize</h3>
							<p>
								Bring your brand to life with the preserved salon storefront
								experience.
							</p>
						</article>
						<article>
							<span>03</span>
							<h3>Grow</h3>
							<p>
								Manage bookings, content, customers, and daily operations from
								one workspace.
							</p>
						</article>
					</div>
				</section>

				<section
					className="platform-section platform-section--plans"
					id="plans"
					aria-labelledby="plans-title"
				>
					<div className="section-heading">
						<p className="eyebrow">Choose your operating level</p>
						<h2 id="plans-title">Plans that grow with your salon.</h2>
						<p>
							Simple monthly pricing in KES, with a{" "}
							<strong>One-Time Setup Fee</strong>.
						</p>
					</div>
					<div className="plans-grid">
						{plans.map((plan) => (
							<article
								className={`plan-card${plan.name === "Business" ? " plan-card--featured" : ""}`}
								key={plan.name}
							>
								{plan.name === "Business" && (
									<span className="plan-card__badge">Recommended</span>
								)}
								<h3>{plan.name}</h3>
								<p className="plan-card__pricing">
									<strong className="plan-card__price">
										KES{" "}
										{(
											PLAN_PRICING[plan.tier].monthlyAmountMinor / 100
										).toLocaleString("en-KE")}
									</strong>{" "}
									<span className="plan-card__billing-period">/month</span>
									<span className="plan-card__setup-fee">
										<strong className="plan-card__setup-amount">
											KES{" "}
											{(
												PLAN_PRICING[plan.tier].setupFeeMinor / 100
											).toLocaleString("en-KE")}
										</strong>{" "}
										One-Time Setup Fee
									</span>
								</p>
								<p className="plan-card__best-for">
									<strong>Best for:</strong>{" "}
									{PLAN_POSITIONING[plan.tier].bestFor}
								</p>
								<p>{plan.description}</p>
								<ul>
									{plan.features.map((feature) => (
										<li key={feature}>
											<span aria-hidden="true">✓</span>
											{feature}
										</li>
									))}
								</ul>
								<Link className="button button--outline" href="/onboarding">
									Start with {plan.name}
								</Link>
							</article>
						))}
					</div>
					<div className="plan-comparison" aria-label="Plan feature comparison">
						<div className="plan-comparison__header">
							<span>Capability</span>
							<span>Starter</span>
							<span>Business</span>
							<span>Enterprise</span>
						</div>
						{(
							[
								["Monthly bookings", "monthlyBookings"],
								["Staff members", "staffMembers"],
								["Gallery items", "galleryItems"],
								["Storage", "storageMegabytes"],
							] as const
						).map(([label, limitKey]) => (
							<div className="plan-comparison__row" key={label}>
								<strong>{label}</strong>
								{(["starter", "business", "enterprise"] as const).map(
									(tier) => {
										const value = PLAN_ENTITLEMENTS[tier].limits[limitKey]
										return (
											<span key={tier}>
												{value === Number.MAX_SAFE_INTEGER
													? "Negotiated"
													: limitKey === "storageMegabytes"
														? value >= 1000
															? `${value / 1000} GB`
															: `${value.toLocaleString("en-KE")} MB`
														: value.toLocaleString("en-KE")}
											</span>
										)
									},
								)}
							</div>
						))}
						{(
							[
								["Waitlist", "waitlist"],
								["Advanced scheduling", "advancedSchedule"],
								["Staff permissions", "staffMembers"],
								["WhatsApp and email automation", "whatsappAutomation"],
								["Custom domains", "customDomains"],
								["Multiple locations", "multipleLocations"],
							] as const
						).map(([label, feature]) => (
							<div className="plan-comparison__row" key={label}>
								<strong>{label}</strong>
								{(["starter", "business", "enterprise"] as const).map(
									(tier) => (
										<span
											key={tier}
											aria-label={`${tier} ${PLAN_ENTITLEMENTS[tier].features[feature] ? "included" : "not included"}`}
										>
											{PLAN_ENTITLEMENTS[tier].features[feature]
												? "Included"
												: "Not included"}
										</span>
									),
								)}
							</div>
						))}
					</div>
				</section>

				<section
					className="platform-section platform-section--contact"
					id="contact"
					aria-labelledby="contact-title"
				>
					<div className="contact-grid">
						<div className="section-heading">
							<p className="eyebrow">Get in touch</p>
							<h2 id="contact-title">Let’s talk about your salon.</h2>
							<p>
								Questions about the platform, ready to open a store, or just
								want to say hello? Drop us a message and the Beauty Sphia team
								will get right back to you.
							</p>
						</div>
						<ContactForm />
					</div>
				</section>
			</main>
			<PlatformFooter />
			<nav
				className="platform-mobile-actions"
				aria-label="Mobile platform navigation"
			>
				<Link href="#home">
					<PlatformIcon name="home" />
					<span>Home</span>
				</Link>
				<Link href="/stores">
					<PlatformIcon name="store" />
					<span>Browse Stores</span>
				</Link>
				<Link href="#plans">
					<PlatformIcon name="plans" />
					<span>Plans</span>
				</Link>
				<Link href="/onboarding">
					<PlatformIcon name="create" />
					<span>Create Store</span>
				</Link>
			</nav>
		</>
	)
}
