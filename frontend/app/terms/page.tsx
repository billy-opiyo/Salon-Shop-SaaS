import Link from "next/link"

import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

export async function generateMetadata() {
	const design = await getPlatformStorefrontDesign()
	return { title: `${design.termsPolicy.title} | ${design.branding.name}` }
}

export default async function TermsPage() {
	const design = await getPlatformStorefrontDesign()
	const policy = design.termsPolicy
	return (
		<div className="platform-site" style={platformThemeStyle(design.theme)}>
			<main className="policy-page">
				<Link className="brand-mark" href="/" aria-label={`${design.branding.name} homepage`}>
					{design.branding.name}
				</Link>
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
		</div>
	)
}
