import Link from "next/link"
import { headers } from "next/headers"

import { getRequestHost } from "@backend/services/tenantDomainService"
import { getTenantStorefrontByHost } from "@backend/services/tenantDirectory"
import { renderTenantStorefront } from "@/app/[tenantSlug]/page"

import { ExperienceSplash } from "@/components/shared/ExperienceSplash"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { PlatformFloatingActions } from "@/components/shared/PlatformFloatingActions"
import { TopStoresGrid } from "@/components/shared/TopStoresGrid"
import { PlatformContactForm } from "@/components/shared/PlatformContactForm"
import { platformThemeStyle } from "@/lib/platformTheme"
import {
	PLAN_ENTITLEMENTS,
} from "@shared/constants/plans"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"

const planTiers = ["starter", "business", "enterprise"] as const

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

function formatPlanAmount(amountMinor: number, currency: string): string {
	return new Intl.NumberFormat("en-KE", {
		style: "currency",
		currency,
		currencyDisplay: "code",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amountMinor / 100)
}

export default async function PlatformHome() {
	const requestHost = getRequestHost(await headers())
	const platformHosts = new Set([
		"localhost",
		"127.0.0.1",
		"beauty-sphia-staging.vercel.app",
		process.env.VERCEL_URL?.toLowerCase(),
		process.env.VERCEL_PROJECT_PRODUCTION_URL?.toLowerCase(),
	].filter((host): host is string => Boolean(host)))
	if (requestHost && !platformHosts.has(requestHost)) {
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
				brandName={design.splash.title}
				logoUrl={design.splash.logoUrl}
				loadingText={design.splash.loadingText}
				backgroundImageUrl={design.splash.backgroundImageUrl}
			/>
			<div className="platform-site platform-site--with-mobile-actions" style={platformThemeStyle(design.theme)}>
			<main id="home" className="platform-home-shell">
				<PlatformHeader page="home" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />

				<section className="platform-hero platform-hero--editorial" aria-labelledby="platform-title">
<div className="platform-hero__copy">
<p className="platform-hero__eyebrow">{design.homeHero.eyebrow}</p><p className="platform-hero__audience">{design.homeHero.audience}</p>
<h1 id="platform-title">{design.homeHero.title} <span>{design.homeHero.highlight}</span></h1>
<p className="platform-hero__description">{design.homeHero.description}</p>
<div className="platform-hero__actions"><Link className="button button--primary" href="/onboarding">{design.homeHero.actionLabel}</Link></div>
</div>
<div className="platform-hero__benefits" aria-label="Platform benefits">
{design.homeHero.benefits.map((benefit, index) => <article key={benefit.title}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><h2>{benefit.title}</h2><p>{benefit.description}</p></article>)}
</div>
<p className="platform-hero__signature">{design.homeHero.signature}</p>
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
						{planTiers.map((tier) => {
							const plan = design.plans[tier]
							return (
							<article
								className={`plan-card${tier === "business" ? " plan-card--featured" : ""}`}
								key={tier}
							>
								{tier === "business" && (
									<span className="plan-card__badge">Recommended</span>
								)}
								<h3>{plan.name}</h3>
								<p className="plan-card__pricing">
									<strong className="plan-card__price">
						{formatPlanAmount(plan.monthlyAmountMinor, design.billing.currency)}
									</strong>{" "}
									<span className="plan-card__billing-period">/month</span>
									<span className="plan-card__setup-fee">
										<strong className="plan-card__setup-amount">
							{formatPlanAmount(plan.setupFeeMinor, design.billing.currency)}
										</strong>{" "}
										One-Time Setup Fee
									</span>
								</p>
								<p className="plan-card__best-for">
									<strong>Best for:</strong>{" "}
									{plan.bestFor}
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
										const entitlement = PLAN_ENTITLEMENTS[tier]
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
							)
						})}
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
							<div className="platform-contact-details" aria-label="Beauty Sphia contact details">
								<a href={`mailto:${design.contact.supportEmail}`}>{design.contact.supportEmail}</a>
								{design.contact.phone && <a href={`tel:${design.contact.phone}`}>{design.contact.phone}</a>}
								{design.contact.whatsappUrl && <a href={design.contact.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp support</a>}
								{design.contact.address && <p>{design.contact.address}</p>}
							</div>
						</div>
						<PlatformContactForm />
					</div>
				</section>
			</main>
			<PlatformFooter brandName={design.branding.name} description={content.footerDescription} supportEmail={design.contact.supportEmail} phone={design.contact.phone} whatsappUrl={design.contact.whatsappUrl} facebookUrl={design.contact.facebookUrl} instagramUrl={design.contact.instagramUrl} tiktokUrl={design.contact.tiktokUrl} />
			<PlatformFloatingActions whatsappUrl={design.contact.whatsappUrl} />
			<PlatformMobileActions active="home" />
			</div>
		</>
	)
}
