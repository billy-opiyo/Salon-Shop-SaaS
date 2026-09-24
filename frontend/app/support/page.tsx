import Link from "next/link"

import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { PlatformHeader } from "@/components/shared/PlatformHeader"

export const metadata = {
	title: "Salon Owner Support | Beauty Sphia",
	description: "Help for salon owners creating and operating Beauty Sphia stores.",
}

export default function SupportPage() {
	const supportEmail = process.env.PLATFORM_SUPPORT_EMAIL?.trim() || "support@beautysphia.com"
	return (
		<>
			<main className="platform-home-shell platform-support-page">
				<PlatformHeader page="support" />
				<section className="platform-section platform-about-hero" aria-labelledby="support-title">
					<p className="eyebrow">Salon Owner Support</p>
					<h1 id="support-title">A helpful partner for every store you build.</h1>
					<p>Need help with setup, storefront content, bookings, billing, or your team workspace? We are here to help you keep your salon moving.</p>
				</section>
				<section className="platform-section platform-support-grid" aria-label="Support options">
					<article><span className="eyebrow">Getting started</span><h2>Launch with confidence.</h2><p>Use the onboarding workspace to set your identity, services, schedule, staff, and storefront content.</p><Link href="/onboarding">Start onboarding</Link></article>
					<article><span className="eyebrow">Direct help</span><h2>Talk to our team.</h2><p>For account, billing, or technical questions, email the Beauty Sphia support team.</p><a href={`mailto:${supportEmail}`}>{supportEmail}</a></article>
					<article><span className="eyebrow">Platform contact</span><h2>Tell us what you need.</h2><p>Share a question or product suggestion directly with the Beauty Sphia team.</p><a href={`mailto:${supportEmail}?subject=Beauty%20Sphia%20platform%20question`}>Email platform support</a></article>
				</section>
			</main>
			<PlatformFooter />
		</>
	)
}
