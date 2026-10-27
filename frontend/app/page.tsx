import Link from "next/link"
import { headers } from "next/headers"

import { getRequestHost } from "@backend/services/tenantDomainService"
import { getTenantStorefrontByHost } from "@backend/services/tenantDirectory"
import { renderTenantStorefront } from "@/app/[tenantSlug]/page"

import { ExperienceSplash } from "@/components/shared/ExperienceSplash"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformActionIcon } from "@/components/shared/PlatformActionIcon"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { TopStoresGrid } from "@/components/shared/TopStoresGrid"
import { ContactForm } from "@/components/shared/ContactForm"
import {
	PLAN_ENTITLEMENTS,
	PLAN_POSITIONING,
	PLAN_PRICING,
} from "@shared/constants/plans"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"

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

const planCapabilities = [
	["Monthly bookings", "limit", "monthlyBookings"],
	["Staff members", "limit", "staffMembers"],
	["Gallery items", "limit", "galleryItems"],
	["Storage", "limit", "storageMegabytes"],
	["Waitlist", "feature", "waitlist"],
	["Advanced scheduling", "feature", "advancedSchedule"],
	["Staff permissions", "feature", "staffMembers"],
	["WhatsApp and email automation", "feature", "whatsappAutomation"],
	["Custom domains", "feature", "customDomains"],
	["Multiple locations", "feature", "multipleLocations"],
] as const

function replaceStoreWording(value: string): string {
	return value.replace(/\bstores?\b/gi, (word) => {
		if (word === word.toUpperCase()) return word.toLowerCase() === "store" ? "SALON" : "SALONS"
		if (word[0] === word[0].toUpperCase()) return word.toLowerCase() === "store" ? "Salon" : "Salons"
		return word.toLowerCase() === "store" ? "salon" : "salons"
	})
}

export default async function PlatformHome() {
	const requestHost = getRequestHost(await headers())
	if (requestHost) {
		const customTenant = await getTenantStorefrontByHost(requestHost)
		if (customTenant) return renderTenantStorefront(customTenant.slug)
	}
	const design = await getPlatformStorefrontDesign()
	const content = Object.fromEntries(
		Object.entries(design.content).map(([key, value]) => [
			key,
			Array.isArray(value)
				? value.map((step) => ({
						title: replaceStoreWording(step.title),
						description: replaceStoreWording(step.description),
					}))
				: typeof value === "string"
					? replaceStoreWording(value)
					: value,
		]),
	) as typeof design.content
	return (
		<>
			<ExperienceSplash
				brandName="Beauty Sphia"
				logoUrl={design.logoUrl}
			/>
			<main id="home" className="platform-home-shell">
				<PlatformHeader page="home" logoUrl={design.logoUrl} />

				<section className="platform-hero platform-hero--editorial" aria-labelledby="platform-title">
<div className="platform-hero__copy">
<p className="platform-hero__eyebrow">The salon platform for owners and customers</p><p className="platform-hero__audience">Salon Owners · Stylists · Customers</p>
<h1 id="platform-title">A better salon experience for <span>everyone</span></h1>
<p className="platform-hero__description">Beauty Sphia helps salon owners manage bookings, clients, and daily operations. Customers can discover salons, explore services, and book appointments with ease.</p>
<div className="platform-hero__actions"><Link className="button button--primary" href="/onboarding">Start Your Salon</Link></div>
</div>
<div className="platform-hero__benefits" aria-label="Platform benefits">
<article><span aria-hidden="true">01</span><h2>Online Bookings</h2><p>Help customers book anytime and keep your salon schedule organized.</p></article>
<article><span aria-hidden="true">02</span><h2>Client Management</h2><p>Build lasting relationships. Keep your clients organized and loyal.</p></article>
<article><span aria-hidden="true">03</span><h2>Salon Discovery</h2><p>Help customers find your salon, explore services, and book a visit.</p></article>
<article><span aria-hidden="true">04</span><h2>Business Growth</h2><p>Make data-driven decisions. Track growth and make smarter decisions.</p></article>
</div>
<p className="platform-hero__signature">More Clients <span>·</span> Less Admin <span>·</span> Bigger Dreams</p>
</section>

				<section
					className="platform-section platform-showcase"
					aria-labelledby="showcase-title"
				>
					<p className="eyebrow">{content.showcaseEyebrow}</p>
					<div className="showcase-copy">
						<h2 id="showcase-title">
							{content.showcaseTitle}
						</h2>
						<p>
							{content.showcaseDescription}
						</p>
						<div className="platform-hero__actions">
							<Link className="button button--primary" href="/stores">
									{content.showcasePrimaryLabel}
							</Link>
						</div>
					</div>
				</section>

				<section
					className="platform-section"
					id="top-stores"
					aria-labelledby="top-stores-title"
				>
					<div className="section-heading">
						<div>
							<p className="eyebrow">{content.topStoresEyebrow}</p>
							<h2 id="top-stores-title">{content.topStoresTitle}</h2>
						</div>
					</div>
					<TopStoresGrid />
					<div className="top-stores-actions">
						<Link className="button button--outline" href="/stores">
							{content.topStoresViewAllLabel}
						</Link>
					</div>
				</section>

				<section
					className="platform-section"
					id="how-it-works"
					aria-labelledby="how-title"
				>
					<div className="section-heading">
						<p className="eyebrow">{content.howEyebrow}</p>
						<h2 id="how-title">{content.howTitle}</h2>
					</div>
					<div className="steps-grid">
						<article>
								<span>01</span><h3>{content.howSteps[0].title}</h3><p>{content.howSteps[0].description}</p>
						</article>
						<article>
							<span>02</span>
								<h3>{content.howSteps[1].title}</h3><p>{content.howSteps[1].description}</p>
						</article>
						<article>
							<span>03</span>
								<h3>{content.howSteps[2].title}</h3><p>{content.howSteps[2].description}</p>
						</article>
					</div>
				</section>

				<section
					className="platform-section platform-section--plans"
					id="plans"
					aria-labelledby="plans-title"
				>
					<div className="section-heading">
						<p className="eyebrow">{content.plansEyebrow}</p>
						<h2 id="plans-title">{content.plansTitle}</h2>
						<p>{content.plansDescription}</p>
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
								<ul className="plan-card__capabilities" aria-label={`${plan.name} plan capabilities`}>
									{planCapabilities.map(([label, kind, key]) => {
										const entitlement = PLAN_ENTITLEMENTS[plan.tier]
										const included = kind === "feature"
											? entitlement.features[key as keyof typeof entitlement.features]
											: true
										const rawValue = kind === "limit"
											? entitlement.limits[key as keyof typeof entitlement.limits]
											: undefined
										const value = typeof rawValue === "number"
											? rawValue === Number.MAX_SAFE_INTEGER
												? "Negotiated"
												: key === "storageMegabytes"
													? rawValue >= 1000
														? `${rawValue / 1000} GB`
														: `${rawValue.toLocaleString("en-KE")} MB`
													: rawValue.toLocaleString("en-KE")
											: included ? "Included" : "Not included"
										return <li key={label} data-included={included}><strong>{label}</strong><span>{value}</span></li>
									})}
								</ul>
								<Link className="button button--outline" href="/onboarding">
									Start with {plan.name}
								</Link>
							</article>
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
							<p className="eyebrow">{content.contactEyebrow}</p>
							<h2 id="contact-title">{content.contactTitle}</h2>
							<p>{content.contactDescription}</p>
						</div>
						<ContactForm />
					</div>
				</section>
			</main>
			<PlatformFooter description={content.footerDescription} />
			<nav
				className="platform-mobile-actions"
				aria-label="Mobile platform navigation"
			>
				<Link href="#home">
					<PlatformActionIcon name="home" />
					<span>Home</span>
				</Link>
				<Link href="/stores">
					<PlatformActionIcon name="salons" />
					<span>Salons</span>
				</Link>

				<Link href="/onboarding">
					<PlatformActionIcon name="start" />
					<span>Start Your Salon</span>
				</Link>
			</nav>
		</>
	)
}
