"use client"

import { useEffect } from "react"

import { SalonAdminMarkup } from "@/components/tenant/SalonAdminMarkup"
import { bindAdminSnapshotAdapter } from "@/components/tenant/SalonStorefrontRuntime"

interface SalonAdminRuntimeProps {
	readonly tenantSlug: string
}

export function SalonAdminRuntime({ tenantSlug }: SalonAdminRuntimeProps) {
	useEffect(() => bindAdminSnapshotAdapter(tenantSlug), [tenantSlug])

	return (
		<div className="salon-admin-root">
			<SalonAdminMarkup homeHref={`/${tenantSlug}`} />
		</div>
	)
}
