import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { getLoginUrlForPath } from "@shared/authCallback"
import { getPlatformStorefrontDesign } from "@backend/services/platformAdminService"
import {
	listDomainsForUser,
	TenantDomainError,
} from "@backend/services/tenantDomainService"

import { DomainManager } from "./DomainManager"

export default async function MerchantDomainsPage({
	params,
}: {
	params: Promise<{ tenantSlug: string }>
}) {
	const { tenantSlug } = await params
	const session = await auth()
	if (!session?.user?.id) redirect(getLoginUrlForPath(`/manage/${tenantSlug}/domains`))
	const design = await getPlatformStorefrontDesign()
	let domains: Awaited<ReturnType<typeof listDomainsForUser>> = []
	let domainMessage: string | null = null
	try {
		domains = await listDomainsForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (error instanceof Error && error.name === "AuthorizationError")
			redirect(`/manage/${tenantSlug}`)
		if (error instanceof TenantDomainError) {
			domains = []
			domainMessage = error.message
		} else {
		throw error
		}
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">{design.branding.name} domains</p>
					<h1>Custom domain</h1>
					<p className="auth-card__intro">
						Connect a verified hostname to this salon storefront.
					</p>
				</div>
			</header>
			{domainMessage ? (
				<p className="form-message form-message--error" role="status">
					{domainMessage}
				</p>
			) : (
				<DomainManager
					tenantSlug={tenantSlug}
					initialDomains={domains.map((domain) => ({
						...domain,
						verifiedAt: domain.verifiedAt?.toISOString() ?? null,
						verificationTokenExpiresAt:
							domain.verificationTokenExpiresAt?.toISOString() ?? null,
					}))}
				/>
			)}
		</main>
	)
}
