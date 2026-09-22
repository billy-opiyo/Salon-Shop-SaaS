import "server-only"

import { prisma } from "@backend/db/prisma"
import type { TenantSettings } from "@prisma/client"
import {
	assertTenantMembership,
	assertTenantPermission,
	type TenantMembershipContext,
	type TenantPermission,
} from "@backend/services/authorization"

/** Server-only tenant authorization boundary for management operations. */
export async function requireTenantPermission(
	userId: string,
	tenantSlug: string,
	permission: TenantPermission,
): Promise<{
	tenant: {
		id: string
		slug: string
		businessName: string
		settings: TenantSettings | null
	}
	membership: TenantMembershipContext
}> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			slug: true,
			businessName: true,
			settings: true,
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageSecurity: true,
				},
			},
		},
	})

	if (!tenant) throw new Error("Store not found.")

	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, permission)
	return { tenant, membership }
}
