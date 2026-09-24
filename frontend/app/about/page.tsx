import Link from "next/link"

import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { PlatformTeamCards } from "@/components/shared/PlatformTeamCards"
import { getPublishedPlatformTeam } from "@backend/services/platformTeamService"

export const metadata = {
	title: "About Beauty Sphia",
	description: "Meet the team building the Beauty Sphia salon operating platform.",
}

// Team profiles are editable platform data and must be read at request time,
// never during a deployment build without a production database connection.
export const dynamic = "force-dynamic"

export default async function AboutPage() {
	const members = await getPublishedPlatformTeam()
	return (
		<>
			<main className="platform-home-shell platform-about-page">
				<PlatformHeader page="about" />
				<section className="platform-section platform-about-hero" aria-labelledby="about-title">
					<p className="eyebrow">About Beauty Sphia</p>
					<h1 id="about-title">The people behind calmer salon operations.</h1>
					<p>Beauty Sphia brings salon owners, their teams, and their clients into one thoughtful operating experience.</p>
				</section>
				<section className="platform-section" aria-labelledby="team-title">
					<div className="section-heading">
						<p className="eyebrow">Meet Our Team</p>
						<h2 id="team-title">The people making Beauty Sphia better.</h2>
						<p>Our team combines product thinking, salon empathy, and careful engineering to help independent businesses grow with confidence.</p>
					</div>
					{members.length ? <PlatformTeamCards members={members} /> : <p className="manage-empty">Our team profiles are being prepared. Please check back soon.</p>}
				</section>
				<section className="platform-section platform-about-cta" aria-label="Get started">
					<h2>Build your next salon chapter with us.</h2>
					<div className="platform-hero__actions"><Link className="button button--primary" href="/onboarding">Create a Store</Link><Link className="button button--ghost" href="/support">Salon Owner Support</Link></div>
				</section>
			</main>
			<PlatformFooter />
		</>
	)
}
