import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantTeamError extends Error {
	readonly code = "MERCHANT_TEAM_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantTeamError"
	}
}

export async function listTeamForUser(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantTeamError("Store not found.")
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId: tenant.id, userId } },
		select: {
			tenantId: true,
			userId: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	assertTenantPermission(
		assertTenantMembership(membership, tenant.id),
		"canManageAdmins",
	)
	return prisma.membership.findMany({
		where: { tenantId: tenant.id },
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
			invitedAt: true,
			joinedAt: true,
			user: { select: { name: true, email: true } },
		},
	})
}
