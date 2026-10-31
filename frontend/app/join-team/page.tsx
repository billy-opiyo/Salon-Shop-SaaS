import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { getLoginUrlForPath } from "@shared/authCallback"
import { platformThemeStyle } from "@/lib/platformTheme"
import { PlatformAuthBrand } from "@/components/shared/PlatformAuthBrand"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"

import { JoinTeamInvitationForm } from "./JoinTeamInvitationForm"

export default async function JoinTeamPage() {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath("/join-team"))
	const design = await getPlatformStorefrontDesign()

	return (
		<div className="platform-site platform-site--with-mobile-actions" style={platformThemeStyle(design.theme)}>
			<main className="auth-page">
				<section className="auth-card" aria-labelledby="join-team-title">
					<PlatformAuthBrand logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
					<p className="eyebrow">Salon team invitation</p>
					<h1 id="join-team-title">Join a salon team</h1>
					<p className="auth-card__intro">
						Enter the invitation code from the salon owner to join their workspace.
					</p>
					<JoinTeamInvitationForm />
					<p className="auth-form__switch">
						<Link href="/account">Return to your {design.branding.name} account</Link>
					</p>
				</section>
			</main>
			<PlatformMobileActions />
		</div>
	)
}
