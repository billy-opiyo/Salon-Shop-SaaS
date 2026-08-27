import { redirect } from "next/navigation"

import { auth } from "@/auth"
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
	const session = await auth()
	if (!session?.user?.id) redirect("/login")
	const { tenantSlug } = await params
	let domains
	try {
		domains = await listDomainsForUser(session.user.id, tenantSlug)
	} catch (error) {
		if (
			error instanceof TenantDomainError ||
			(error instanceof Error && error.name === "AuthorizationError")
		)
			redirect(`/manage/${tenantSlug}`)
		throw error
	}
	return (
		<main className="manage-page">
			<header className="manage-header">
				<div>
					<p className="eyebrow">Beauty Sphia domains</p>
					<h1>Custom domain</h1>
					<p className="auth-card__intro">
						Connect a verified hostname to this salon storefront.
					</p>
				</div>
			</header>
			<DomainManager
				tenantSlug={tenantSlug}
				initialDomains={domains.map((domain) => ({
					...domain,
					verifiedAt: domain.verifiedAt?.toISOString() ?? null,
					verificationTokenExpiresAt:
						domain.verificationTokenExpiresAt?.toISOString() ?? null,
				}))}
			/>
		</main>
	)
}
