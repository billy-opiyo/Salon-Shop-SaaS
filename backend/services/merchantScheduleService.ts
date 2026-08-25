import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantScheduleError extends Error {
	readonly code = "MERCHANT_SCHEDULE_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantScheduleError"
	}
}

export async function listScheduleForUser(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantScheduleError("Store not found.")
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
		"canManageBookings",
	)
	return prisma.booking.findMany({
		where: {
			tenantId: tenant.id,
			appointmentDate: { gte: new Date(new Date().toISOString().slice(0, 10)) },
			status: { not: "CANCELLED" },
		},
		orderBy: [{ appointmentDate: "asc" }, { timeLabel: "asc" }],
		take: 100,
		select: {
			id: true,
			firstName: true,
			lastName: true,
			serviceName: true,
			appointmentDate: true,
			timeLabel: true,
			status: true,
		},
	})
}
