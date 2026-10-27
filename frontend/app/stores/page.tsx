import Link from "next/link"

import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"
import { TopStoresGrid } from "@/components/shared/TopStoresGrid"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

export async function generateMetadata() {
	const design = await getPlatformStorefrontDesign()
	return {
		title: `Salons | ${design.branding.name}`,
		description: design.directory.description,
	}
}

export default async function StoresDirectoryPage() {
	const design = await getPlatformStorefrontDesign()
	const directory = design.directory
	return (
		<div className="platform-site platform-site--with-mobile-actions" style={platformThemeStyle(design.theme)}>
		<main id="home" className="platform-home-shell stores-directory">
			<PlatformHeader page="stores" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />

			<section
				className="platform-section platform-section--directory-hero"
				aria-labelledby="directory-title"
			>
				<div className="section-heading">
					<p className="eyebrow">{directory.eyebrow}</p>
					<h1 id="directory-title">{directory.title}</h1>
					<p>{directory.description}</p>
				</div>
			</section>

			<section
				className="platform-section"
				id="top-stores"
				aria-labelledby="top-stores-title"
			>
				<div className="section-heading">
					<p className="eyebrow">{directory.listEyebrow}</p>
					<h2 id="top-stores-title">{directory.listTitle}</h2>
					<p>{directory.listDescription}</p>
				</div>
				<TopStoresGrid showAll />
			</section>

			<section className="platform-section platform-section--directory-cta">
				<div className="directory-cta">
					<p className="eyebrow">{directory.ctaEyebrow}</p>
					<h2>{directory.ctaTitle}</h2>
					<p>{directory.ctaDescription}</p>
					<div className="platform-hero__actions">
						<Link className="button button--primary" href="/onboarding">
							Start Your Salon
						</Link>
					</div>
				</div>
			</section>




		</main>
		<PlatformMobileActions active="salons" />
		</div>
	)
}
