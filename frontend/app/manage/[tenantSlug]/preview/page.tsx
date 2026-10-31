import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { prisma } from "@backend/db/prisma"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"

export default async function MerchantPreviewPage({
	params,
}: {
	params: Promise<{ tenantSlug: string }>
}) {
	const { tenantSlug } = await params
	const session = await auth()
	if (!session?.user?.id)
		redirect(getLoginUrlForPath(`/manage/${tenantSlug}/preview`))
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			slug: true,
			status: true,
			memberships: {
				where: { userId: session.user.id, status: "ACTIVE" },
				select: { status: true, role: true, canManageContent: true },
			},
		},
	})
	const membership = tenant?.memberships[0]
	if (
		!tenant ||
		!membership ||
		(membership.role !== "OWNER" && !membership.canManageContent)
	)
		redirect(`/manage/${tenantSlug}`)
	if (tenant.status !== "ACTIVE") {
		const design = await getPlatformStorefrontDesign()
		const isDraft = tenant.status === "DRAFT"
		return (
			<main className="manage-page">
				<section className="manage-card merchant-billing-activation" aria-labelledby="storefront-preview-status">
					<p className="eyebrow">Storefront preview</p>
					<h1 id="storefront-preview-status">
						{isDraft ? "Your salon is not live yet" : "Your storefront is unavailable"}
					</h1>
					<p>
						{isDraft
							? "Your storefront stays private until setup is complete and an authorized team member publishes it. You can continue editing the salon design in the meantime."
							: `This storefront is not publicly available right now. Review its billing status or contact ${design.branding.name} support for help.`}
					</p>
					<div className="manage-header__actions">
						<Link className="button button--primary" href={`/manage/${tenant.slug}/billing`}>
							{isDraft ? "Continue salon setup" : "Review billing status"}
						</Link>
						{isDraft && (
							<Link className="button button--outline" href={`/manage/${tenant.slug}?section=design`}>
								Edit salon design
							</Link>
						)}
					</div>
				</section>
			</main>
		)
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Storefront preview</p>
					<h1>Preview {tenant.slug}</h1>
					<p className="auth-card__intro">
						Preview the currently published storefront in a separate tab.
					</p>
				</div>
				<a
					className="button button--primary"
					href={`/${tenant.slug}`}
					target="_blank"
					rel="noreferrer"
				>
					Open storefront
				</a>
			</header>
		</main>
	)
}
