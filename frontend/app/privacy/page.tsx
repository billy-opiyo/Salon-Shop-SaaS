import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"

export async function generateMetadata() {
	const design = await getPlatformStorefrontDesign()
	return { title: `${design.privacyPolicy.title} | ${design.branding.name}` }
}

export default async function PrivacyPage() {
	const design = await getPlatformStorefrontDesign()
	const policy = design.privacyPolicy
	return (
		<div className="platform-site platform-site--with-mobile-actions" style={platformThemeStyle(design.theme)}>
			<PlatformHeader page="about" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
			<main className="policy-page">
				<p className="eyebrow">{policy.eyebrow}</p>
				<h1>{policy.title}</h1>
				<p>{policy.introduction}</p>
				{policy.sections.map((section) => (
					<section key={section.heading}>
						<h2>{section.heading}</h2>
						<p>{section.body}</p>
					</section>
				))}
			</main>
			<PlatformFooter brandName={design.branding.name} description={design.content.footerDescription} supportEmail={design.contact.supportEmail} phone={design.contact.phone} whatsappUrl={design.contact.whatsappUrl} facebookUrl={design.contact.facebookUrl} instagramUrl={design.contact.instagramUrl} tiktokUrl={design.contact.tiktokUrl} />
			<PlatformMobileActions />
		</div>
	)
}
