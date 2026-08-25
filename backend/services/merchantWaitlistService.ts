import "server-only"

import { Prisma, WaitlistStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
	type TenantMembershipContext,
} from "@backend/services/authorization"

export class MerchantWaitlistError extends Error {
	readonly code = "MERCHANT_WAITLIST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "MerchantWaitlistError"
	}
}

async function getMembership(
	userId: string,
	tenantSlug: string,
): Promise<TenantMembershipContext> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantWaitlistError("Store not found.")
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
	return assertTenantMembership(membership, tenant.id)
}

export async function listWaitlistForUser(userId: string, tenantSlug: string) {
	const membership = await getMembership(userId, tenantSlug)
	assertTenantPermission(membership, "canManageBookings")
	return prisma.waitlistEntry.findMany({
		where: { tenantId: membership.tenantId },
		orderBy: [
			{ status: "asc" },
			{ queuePosition: "asc" },
			{ createdAt: "asc" },
		],
		select: {
			id: true,
			email: true,
			phone: true,
			serviceName: true,
			preferredDate: true,
			preferredTime: true,
			preferredStylist: true,
			queuePosition: true,
			status: true,
			linkedBookingId: true,
			user: { select: { name: true } },
		},
	})
}

export async function updateWaitlistStatusForUser(
	userId: string,
	tenantSlug: string,
	entryId: string,
	status: WaitlistStatus,
): Promise<void> {
	const membership = await getMembership(userId, tenantSlug)
	assertTenantPermission(membership, "canManageBookings")
	await prisma.$transaction(async (transaction) => {
		const entry = await transaction.waitlistEntry.findFirst({
			where: { id: entryId, tenantId: membership.tenantId },
			select: { status: true },
		})
		if (!entry) throw new MerchantWaitlistError("Waitlist entry not found.")
		if (
			entry.status === WaitlistStatus.CANCELLED &&
			status !== WaitlistStatus.CANCELLED
		)
			throw new MerchantWaitlistError(
				"Cancelled waitlist entries cannot be reopened.",
			)
		await transaction.waitlistEntry.update({
			where: { id: entryId },
			data: { status },
		})
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: `waitlist.status.${status.toLowerCase()}`,
				resourceType: "waitlist",
				resourceId: entryId,
				metadata: {
					previousStatus: entry.status,
					nextStatus: status,
				} as Prisma.InputJsonValue,
			},
		})
	})
}
