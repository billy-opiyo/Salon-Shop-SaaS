import Link from "next/link"
import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { PlatformFooter } from "@/components/shared/PlatformFooter"
import { PlatformMobileActions } from "@/components/shared/PlatformActionIcon"
import { PlatformHeader } from "@/components/shared/PlatformHeader"
import { getClientAccountSnapshot } from "@backend/services/clientAccountService"
import { prisma } from "@backend/db/prisma"
import { listTenantsForUser } from "@backend/services/tenantProvisioning"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import { getLoginUrlForPath } from "@shared/authCallback"
import { platformThemeStyle } from "@/lib/platformTheme"

import { PlatformAccountClient } from "./PlatformAccountClient"
import { PublishSalonForm } from "./PublishSalonForm"

export async function generateMetadata() {
	const design = await getPlatformStorefrontDesign()
	return {
		title: `My account | ${design.branding.name}`,
		description: `Manage your ${design.branding.name} profile, bookings, and salon accounts.`,
	}
}

function formatSalonStatus(status: string): string {
	return status
		.split("_")
		.map((part) => part.charAt(0) + part.slice(1).toLowerCase())
		.join(" ")
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
		<div className="platform-site platform-site--with-mobile-actions platform-account-page" style={platformThemeStyle(design.theme)}>
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
					{salons.length ? <div className="platform-account-salons__grid">{salons.map((salon) => {
						const setupPaymentRequired = salon.subscription?.status === "setup_payment_required"
						const readyToPublish = salon.subscription?.status === "setup_paid_pending_activation"
						const membership = salon.memberships[0]
						const canManageBilling = membership?.role === "OWNER" || (membership?.role === "ADMIN" && membership.canManageBilling)
						const canPublish = membership?.role === "OWNER" || membership?.canManageContent
						const nextStep = setupPaymentRequired
							? canManageBilling ? "Next step: complete setup payment" : "Next step: ask the salon owner or billing administrator to complete setup payment"
							: readyToPublish
								? canPublish ? "Next step: publish your salon" : "Next step: ask the salon owner or a content manager to publish your salon"
								: canManageBilling ? "Next step: check setup status" : "Setup is being confirmed; contact the salon owner if this takes longer than expected"
						return (
							<article className="platform-account-salon" key={salon.id}>
								<div>
								<p className="eyebrow">{salon.subscription?.plan.displayName ?? "Salon"} · {formatSalonStatus(salon.status)}</p>
									<h3>{salon.businessName}</h3>
									<span>Storefront path: /{salon.slug}</span>
									{salon.status === "DRAFT" && <span className="platform-account-salon__next-step">{nextStep}</span>}
								</div>
								<div className="platform-account-salon__actions">
									{salon.status === "DRAFT" && setupPaymentRequired && canManageBilling && <Link className="button button--primary button--small" href={`/manage/${salon.slug}/billing?setup=required`}>Continue setup payment</Link>}
									{salon.status === "DRAFT" && readyToPublish && canPublish && <PublishSalonForm tenantId={salon.id} />}
									{salon.status === "DRAFT" && !setupPaymentRequired && !readyToPublish && canManageBilling && <Link className="button button--outline button--small" href={`/manage/${salon.slug}/billing`}>Check payment status</Link>}
									{salon.status !== "DRAFT" && <Link className="button button--outline button--small" href={`/manage/${salon.slug}`}>Manage salon</Link>}
									{salon.status === "ACTIVE" && <Link className="button button--ghost button--small" href={`/${salon.slug}`}>View storefront</Link>}
								</div>
							</article>
						)
					})}</div> : <p className="platform-account-empty">No salon workspaces are connected to this account yet. You can still explore salons and manage your bookings here.</p>}
				</section>

				<PlatformAccountClient initialSnapshot={account} canDeleteAccount={ownedSalonCount === 0} />
			</main>
			<PlatformFooter brandName={design.branding.name} description={design.content.footerDescription} supportEmail={design.contact.supportEmail} phone={design.contact.phone} whatsappUrl={design.contact.whatsappUrl} facebookUrl={design.contact.facebookUrl} instagramUrl={design.contact.instagramUrl} tiktokUrl={design.contact.tiktokUrl} />
			<PlatformMobileActions />
		</div>
	)
}
