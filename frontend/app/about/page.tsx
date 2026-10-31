import Link from "next/link"

import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"
import { PlatformTeamCards } from "@/components/shared/PlatformTeamCards"
import { getPublishedPlatformTeam } from "@backend/services/platformTeamService"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

export async function generateMetadata() {
	const design = await getPlatformStorefrontDesign()
	return {
		title: `About ${design.branding.name}`,
		description: design.about.description,
	}
}

// Team profiles are editable platform data and must be read at request time,
// never during a deployment build without a production database connection.
export const dynamic = "force-dynamic"

export default async function AboutPage() {
	const design = await getPlatformStorefrontDesign()
	const members = await getPublishedPlatformTeam().catch(() => [])
	return (
		<div className="platform-site platform-site--with-mobile-actions" style={platformThemeStyle(design.theme)}>
			<main className="platform-home-shell platform-about-page">
				<PlatformHeader page="about" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
				<section className="platform-section platform-about-hero" aria-labelledby="about-title">
					<p className="eyebrow">{design.about.eyebrow}</p>
					<h1 id="about-title">{design.about.title}</h1>
					<p>{design.about.description}</p>
				</section>
				<section className="platform-section" aria-labelledby="team-title">
					<div className="section-heading">
						<p className="eyebrow">{design.about.teamEyebrow}</p>
						<h2 id="team-title">{design.about.teamTitle}</h2>
						<p>{design.about.teamDescription}</p>
					</div>
					{members.length ? <PlatformTeamCards members={members} /> : <div className="platform-team-empty"><p>Team profiles are unavailable right now. You can still reach our team for help.</p><Link className="button button--outline" href="/support">Contact {design.branding.name} support</Link></div>}
				</section>
				<section className="platform-section platform-about-cta" aria-label="Get started">
					<h2>{design.about.ctaTitle}</h2>
					<div className="platform-hero__actions"><Link className="button button--primary" href="/onboarding">Start Your Salon</Link><Link className="button button--ghost" href="/support">Salon Owner Support</Link></div>
				</section>
			</main>
			<PlatformMobileActions />
		</div>
	)
}
