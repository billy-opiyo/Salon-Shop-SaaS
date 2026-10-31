import { AuthCloseButton } from "@/components/shared/AuthCloseButton"
import { PlatformAuthBrand } from "@/components/shared/PlatformAuthBrand"
import { SignupForm } from "./SignupForm"
import { getSafeAuthCallbackUrl } from "@shared/authCallback"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

export default async function SignupPage({
	searchParams,
}: {
	readonly searchParams: Promise<{ readonly callbackUrl?: string | string[] }>
}) {
	const [{ callbackUrl }, design] = await Promise.all([
		searchParams,
		getPlatformStorefrontDesign(),
	])
	const safeCallbackUrl = getSafeAuthCallbackUrl(callbackUrl)
	return (
		<div className="platform-site" style={platformThemeStyle(design.theme)}>
			<main className="auth-page">
				<section className="auth-card" aria-labelledby="signup-title">
					<AuthCloseButton label="Close account creation" />
					<PlatformAuthBrand logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
					<div className="auth-card-head">
						<p className="section-subtitle">Start your salon journey</p>
						<h1 id="signup-title">Create your {design.branding.name} account</h1>
						<p className="auth-card__intro">
							Set up your account first. You can add your salon details and choose a plan next.
						</p>
					</div>
					<SignupForm callbackUrl={safeCallbackUrl} brandName={design.branding.name} />
				</section>
			</main>
		</div>
	)
}
