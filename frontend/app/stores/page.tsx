import Link from "next/link"

import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformActionIcon } from "@/components/shared/PlatformActionIcon"
import { TopStoresGrid } from "@/components/shared/TopStoresGrid"

export const metadata = {
	title: "Salons | Beauty Sphia",
	description:
		"Explore top salons on Beauty Sphia — discover newly added, high-rated stores and step inside a live salon experience.",
}

export default function StoresDirectoryPage() {
	return (
		<main id="home" className="platform-home-shell stores-directory">
			<PlatformHeader page="stores" />

			<section
				className="platform-section platform-section--directory-hero"
				aria-labelledby="directory-title"
			>
				<div className="section-heading">
					<p className="eyebrow">The Beauty Sphia Directory</p>
					<h1 id="directory-title">Find your next favourite salon.</h1>
					<p>
						Browse independent salons already running on Beauty Sphia.
						Discover freshly launched stores and community favourites,
						then step inside a live salon experience.
					</p>
				</div>
			</section>

			<section
				className="platform-section"
				id="top-stores"
				aria-labelledby="top-stores-title"
			>
				<div className="section-heading">
					<p className="eyebrow">Curated picks</p>
					<h2 id="top-stores-title">Top Stores Available</h2>
					<p>
						Our most-loved and most recently added salons, ranked for
						you. New stores are featured as they open their doors.
					</p>
				</div>
				<TopStoresGrid />
			</section>

			<section className="platform-section platform-section--directory-cta">
				<div className="directory-cta">
					<p className="eyebrow">Own your corner of the platform</p>
					<h2>Ready to open your own store?</h2>
					<p>
						Join Royal Braids and the growing family of independent
						salons bringing their brand online with Beauty Sphia.
					</p>
					<div className="platform-hero__actions">
						<Link className="button button--primary" href="/onboarding">
							Start Your Salon
						</Link>
					</div>
				</div>
			</section>




			<nav
				className="platform-mobile-actions"
				aria-label="Mobile platform navigation"
			>
				<Link href="/">
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
		</main>
	)
}
