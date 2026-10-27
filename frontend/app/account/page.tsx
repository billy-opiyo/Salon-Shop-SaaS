import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { getClientAccountSnapshot } from "@backend/services/clientAccountService"
import { prisma } from "@backend/db/prisma"
import { listTenantsForUser } from "@backend/services/tenantProvisioning"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { getLoginUrlForPath } from "@shared/authCallback"
import { platformThemeStyle } from "@/lib/platformTheme"

import { publishStore } from "@/app/manage/actions"
import { PlatformAccountClient } from "./PlatformAccountClient"

export const metadata = {
	title: "My account | Beauty Sphia",
	description: "Manage your Beauty Sphia profile, bookings, and salon accounts.",
}

export default async function AccountPage() {
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath("/account"))
	const [design, account, salons, ownedSalonCount] = await Promise.all([
		getPlatformStorefrontDesign(),
		getClientAccountSnapshot(session.user.id),
		listTenantsForUser(session.user.id),
		prisma.tenant.count({ where: { ownerUserId: session.user.id } }),
	])
	return (
		<div className="platform-site platform-account-page" style={platformThemeStyle(design.theme)}>
			<PlatformHeader page="account" logoUrl={design.logoUrl} brandName={design.branding.name} brandTagline={design.branding.tagline} />
			<main className="platform-account-shell">
				<header className="platform-account-hero">
					<p className="platform-hero__eyebrow">Your Beauty Sphia</p>
					<h1>My account</h1>
					<p>Keep your personal details, appointments, and saved salon styles together. Salon setup and management stay in their own dedicated areas.</p>
				</header>

				<section className="platform-account-salons" aria-labelledby="account-salons-title">
					<div className="section-heading section-heading--row">
						<div><p className="eyebrow">For salon owners</p><h2 id="account-salons-title">Your salons</h2></div>
						<Link className="button button--primary" href="/onboarding">Start Your Salon</Link>
					</div>
					{salons.length ? <div className="platform-account-salons__grid">{salons.map((salon) => (
						<article className="platform-account-salon" key={salon.id}>
							<div><p className="eyebrow">{salon.subscription?.plan.displayName ?? "Salon"} · {salon.status}</p><h3>{salon.businessName}</h3><span>beautysphia.com/{salon.slug}</span></div>
							<div className="platform-account-salon__actions">
								<Link className="button button--outline button--small" href={`/manage/${salon.slug}`}>Manage salon</Link>
								{salon.status === "ACTIVE" && <Link className="button button--ghost button--small" href={`/${salon.slug}`}>View storefront</Link>}
								{salon.status === "DRAFT" && <form action={publishStore}><input type="hidden" name="tenantId" value={salon.id} /><button className="button button--primary button--small" type="submit">Publish salon</button></form>}
								{salon.status === "DRAFT" && <Link className="platform-account-salon__setup-link" href={`/manage/${salon.slug}/billing`}>Review setup payment</Link>}
							</div>
						</article>
					))}</div> : <p className="platform-account-empty">No salon workspaces are connected to this account yet. You can still explore salons and manage your bookings here.</p>}
				</section>

				<PlatformAccountClient initialSnapshot={account} canDeleteAccount={ownedSalonCount === 0} />
			</main>
			<PlatformFooter brandName={design.branding.name} description={design.content.footerDescription} supportEmail={design.contact.supportEmail} phone={design.contact.phone} whatsappUrl={design.contact.whatsappUrl} facebookUrl={design.contact.facebookUrl} instagramUrl={design.contact.instagramUrl} tiktokUrl={design.contact.tiktokUrl} />
		</div>
	)
}
