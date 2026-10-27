import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"
import { getLoginUrlForPath } from "@shared/authCallback"

import { StoreSetupForm } from "./StoreSetupForm"

export default async function OnboardingPage() {
	const session = await auth()
	if (!session?.user) redirect(getLoginUrlForPath("/onboarding"))
	const design = await getPlatformStorefrontDesign()

	return (
		<div className="platform-site onboarding-platform" style={platformThemeStyle(design.theme)}>
			<PlatformHeader page="onboarding" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
			<main className="onboarding-page onboarding-page--platform">
				<section className="onboarding-card onboarding-card--platform" aria-labelledby="onboarding-title">
					<div className="onboarding-card__copy">
						<p className="eyebrow">Salon setup · {design.branding.name}</p>
						<h1 id="onboarding-title">Start Your Salon</h1>
						<p className="onboarding-card__lead">Set up your salon’s name, address, and plan. Your account and salon remain private until you complete setup and publish the storefront.</p>
						<ol className="onboarding-steps">
							<li><span>01</span><div><strong>Reserve your salon address</strong><p>Choose a short Beauty Sphia link for your business.</p></div></li>
							<li><span>02</span><div><strong>Choose your plan</strong><p>Review the plan and one-time setup fee before continuing.</p></div></li>
							<li><span>03</span><div><strong>Finish setup securely</strong><p>Complete the setup payment, then publish and customize your salon.</p></div></li>
						</ol>
						<p className="onboarding-card__account">Signed in as <strong>{session.user.email}</strong></p>
					</div>
					<div className="onboarding-card__form">
						<div className="onboarding-card__form-heading"><p className="eyebrow">Your business details</p><h2>Salon profile</h2><p>Fields with an asterisk are required.</p></div>
						<StoreSetupForm freeUsageMonths={design.billing.freeUsageMonths} currency={design.billing.currency} plans={design.plans} />
						<div className="onboarding-card__footer"><Link href="/account">Back to your account</Link><Link href="/support">Need setup help?</Link></div>
					</div>
				</section>
			</main>
		</div>
	)
}
