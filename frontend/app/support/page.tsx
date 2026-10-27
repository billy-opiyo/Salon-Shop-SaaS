import Link from "next/link"

import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

export async function generateMetadata() {
	const design = await getPlatformStorefrontDesign()
	return {
		title: `Salon Owner Support | ${design.branding.name}`,
		description: design.support.description,
	}
}

export default async function SupportPage() {
	const design = await getPlatformStorefrontDesign()
	const support = design.support
	const contact = design.contact
	return (
		<div className="platform-site platform-site--with-mobile-actions" style={platformThemeStyle(design.theme)}>
			<main className="platform-home-shell platform-support-page">
				<PlatformHeader page="support" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
				<section className="platform-section platform-about-hero" aria-labelledby="support-title">
					<p className="eyebrow">{support.eyebrow}</p>
					<h1 id="support-title">{support.title}</h1>
					<p>{support.description}</p>
				</section>
				<section className="platform-section platform-support-grid" aria-label="Support options">
					<article><span className="eyebrow">{support.gettingStartedEyebrow}</span><h2>{support.gettingStartedTitle}</h2><p>{support.gettingStartedDescription}</p><Link href="/onboarding">Start onboarding</Link></article>
					<article><span className="eyebrow">{support.directHelpEyebrow}</span><h2>{support.directHelpTitle}</h2><p>{support.directHelpDescription}</p><a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>{contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}</article>
					<article><span className="eyebrow">{support.contactEyebrow}</span><h2>{support.contactTitle}</h2><p>{support.contactDescription}</p><a href={contact.whatsappUrl || `mailto:${contact.supportEmail}?subject=${encodeURIComponent(`${design.branding.name} platform question`)}`}>{contact.whatsappUrl ? "Chat with platform support" : "Email platform support"}</a></article>
				</section>
				<section className="platform-section platform-support-faq" aria-labelledby="support-faq-title">
					<div className="section-heading">
						<p className="eyebrow">{support.faqEyebrow}</p>
						<h2 id="support-faq-title">{support.faqTitle}</h2>
						<p>{support.faqDescription}</p>
					</div>
					<div className="platform-support-faq__list">
						{support.faqs.map((faq, index) => (
							<details className="platform-support-faq__item" key={`${index}-${faq.question}`}>
								<summary>{faq.question}<span aria-hidden="true" /></summary>
								<p>{faq.answer}</p>
							</details>
						))}
					</div>
				</section>
			</main>
			<PlatformMobileActions />
		</div>
	)
}
