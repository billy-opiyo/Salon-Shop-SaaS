"use client"

import { useEffect } from "react"

import {
	SalonAdminMarkup,
	type SalonAdminSection,
} from "@/components/tenant/SalonAdminMarkup"
import { bindAdminSnapshotAdapter } from "@/components/tenant/SalonStorefrontRuntime"

interface SalonAdminRuntimeProps {
	readonly tenantSlug: string
	readonly userEmail: string
	readonly initialSection: SalonAdminSection
	readonly allowedSections: readonly SalonAdminSection[]
}

export function SalonAdminRuntime({
	tenantSlug,
	userEmail,
	initialSection,
	allowedSections,
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
			/>
		</div>
	)
}
