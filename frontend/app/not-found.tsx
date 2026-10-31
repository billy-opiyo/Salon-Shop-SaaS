import Image from "next/image"
import Link from "next/link"

import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"

export default async function NotFound() {
	const design = await getPlatformStorefrontDesign()
	return (
		<div className="platform-site platform-site--with-mobile-actions platform-not-found" style={platformThemeStyle(design.theme)}>
			<header className="platform-header">
				<Link className="brand-mark" href="/" aria-label={`${design.branding.name} homepage`}>
					<Image
						className="brand-mark__image"
						src={design.logoUrl}
						alt=""
						width={48}
						height={48}
						unoptimized
					/>
					<span className="brand-mark__copy">
						<strong className="brand-mark__title">{design.branding.name}</strong>
						<span className="brand-mark__tagline">{design.branding.tagline}</span>
					</span>
				</Link>
			</header>
			<main className="platform-home-shell platform-not-found__main">
				<section className="platform-section platform-not-found__card" aria-labelledby="not-found-title">
					<p className="eyebrow">A little detour</p>
					<p className="platform-not-found__code" aria-hidden="true">404</p>
					<h1 id="not-found-title">We couldn’t find that page.</h1>
					<p>The address may have changed or the page may no longer be available. Head back to {design.branding.name} or explore the salons on the platform.</p>
					<div className="platform-hero__actions">
						<Link className="button button--primary" href="/">
							Back to {design.branding.name}
						</Link>
						<Link className="button button--outline" href="/stores">Explore salons</Link>
					</div>
				</section>
			</main>
			<PlatformMobileActions />
		</div>
	)
}
