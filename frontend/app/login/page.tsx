import { AuthCloseButton } from "@/components/shared/AuthCloseButton"
import { PlatformAuthBrand } from "@/components/shared/PlatformAuthBrand"
import { LoginForm } from "./LoginForm"
import { getSafeAuthCallbackUrl } from "@shared/authCallback"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { platformThemeStyle } from "@/lib/platformTheme"

interface LoginPageProps {
	readonly searchParams: Promise<{ readonly callbackUrl?: string | string[] }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
	const [{ callbackUrl }, design] = await Promise.all([
		searchParams,
		getPlatformStorefrontDesign(),
	])
	const safeCallbackUrl = getSafeAuthCallbackUrl(callbackUrl)
	return (
		<div className="platform-site" style={platformThemeStyle(design.theme)}>
			<main className="auth-page">
				<section className="auth-card" aria-labelledby="login-title">
					<AuthCloseButton label="Close sign in" />
					<PlatformAuthBrand logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
					<div className="auth-card-head">
						<p className="section-subtitle">Welcome back</p>
						<h1 id="login-title">Sign in to your Beauty Sphia account</h1>
						<p className="auth-card__intro">
							Access your appointments, saved styles, profile, and salon workspace from one place.
						</p>
					</div>
					<LoginForm callbackUrl={safeCallbackUrl} />
				</section>
			</main>
		</div>
	)
}
