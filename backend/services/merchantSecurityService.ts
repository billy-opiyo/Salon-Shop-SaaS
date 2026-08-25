import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantSecurityError extends Error {
	readonly code = "MERCHANT_SECURITY_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantSecurityError"
	}
}

export async function getSecuritySnapshot(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantSecurityError("Store not found.")
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
		"canManageSecurity",
	)
	const [logins, alerts, changes] = await Promise.all([
		prisma.loginActivity.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 50,
			select: {
				id: true,
				email: true,
				provider: true,
				status: true,
				riskLevel: true,
				riskScore: true,
				userAgent: true,
				country: true,
				createdAt: true,
			},
		}),
		prisma.securityAlert.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 50,
			select: {
				id: true,
				severity: true,
				alertType: true,
				message: true,
				resolvedAt: true,
				createdAt: true,
			},
		}),
		prisma.accountChangeHistory.findMany({
			where: { tenantId: tenant.id },
			orderBy: { createdAt: "desc" },
			take: 50,
			select: { id: true, changeType: true, summary: true, createdAt: true },
		}),
	])
	return { logins, alerts, changes }
}
