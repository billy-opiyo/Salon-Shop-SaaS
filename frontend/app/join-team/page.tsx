import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { getLoginUrlForPath } from "@shared/authCallback"
import { platformThemeStyle } from "@/lib/platformTheme"

import { JoinTeamInvitationForm } from "./JoinTeamInvitationForm"

export default async function JoinTeamPage() {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath("/join-team"))
	const design = await getPlatformStorefrontDesign()

	return (
		<div className="platform-site" style={platformThemeStyle(design.theme)}>
			<main className="auth-page">
				<section className="auth-card" aria-labelledby="join-team-title">
					<Link className="brand-mark" href="/">
						{design.branding.name}
					</Link>
					<p className="eyebrow">Salon team invitation</p>
					<h1 id="join-team-title">Join a salon team</h1>
					<p className="auth-card__intro">
						Enter the invitation code from the salon owner to join their workspace.
					</p>
					<JoinTeamInvitationForm />
					<p className="auth-form__switch">
						<Link href="/account">Return to your Beauty Sphia account</Link>
					</p>
				</section>
			</main>
		</div>
	)
}
