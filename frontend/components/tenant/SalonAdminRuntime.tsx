"use client"

import { useEffect } from "react"

import {
	SalonAdminMarkup,
	type SalonAdminSection,
} from "@/components/tenant/SalonAdminMarkup"
import {
	MerchantWorkspaceNavigation,
	type MerchantWorkspaceNavigationAccess,
} from "@/components/tenant/MerchantWorkspaceNavigation"
import { bindAdminSnapshotAdapter } from "@/components/tenant/SalonStorefrontRuntime"

interface SalonAdminRuntimeProps {
	readonly tenantSlug: string
	readonly userEmail: string
	readonly initialSection: SalonAdminSection
	readonly allowedSections: readonly SalonAdminSection[]
	readonly navigationAccess: MerchantWorkspaceNavigationAccess
}

export function SalonAdminRuntime({
	tenantSlug,
	userEmail,
	initialSection,
	allowedSections,
	navigationAccess,
}: SalonAdminRuntimeProps) {
	useEffect(() => bindAdminSnapshotAdapter(tenantSlug, userEmail), [tenantSlug, userEmail])

	return (
		<div className="salon-admin-root">
			<SalonAdminMarkup
				homeHref={`/${tenantSlug}`}
				settingsHref={`/manage/${tenantSlug}/settings`}
				servicesHref={`/manage/${tenantSlug}/services?view=catalog`}
				userEmail={userEmail}
				initialSection={initialSection}
				allowedSections={allowedSections}
				workspaceNavigation={
					<MerchantWorkspaceNavigation
						tenantSlug={tenantSlug}
						access={navigationAccess}
						placement="console"
					/>
				}
			/>
		</div>
	)
}
