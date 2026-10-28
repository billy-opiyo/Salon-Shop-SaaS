import "server-only"

import { Prisma, WaitlistStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
	type TenantMembershipContext,
} from "@backend/services/authorization"
import { recalculateWaitlistQueuePositions } from "@backend/services/waitlistQueueService"

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
	const entries = await prisma.waitlistEntry.findMany({
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
			inspirationImageUrl: true,
			serviceName: true,
			preferredDate: true,
			preferredTime: true,
			preferredStylist: true,
			queuePosition: true,
			status: true,
			linkedBookingId: true,
			linkedBooking: { select: { id: true, status: true } },
			user: { select: { name: true } },
			createdAt: true,
			updatedAt: true,
		},
	})
	const activeStatuses = new Set<WaitlistStatus>([
		WaitlistStatus.WAITING,
		WaitlistStatus.NOTIFIED,
		WaitlistStatus.CONTACTED,
		WaitlistStatus.NOTIFICATION_FAILED,
	])
	const queueSizes = new Map<string, number>()
	for (const entry of entries) {
		if (!activeStatuses.has(entry.status)) continue
		const date = entry.preferredDate?.toISOString().slice(0, 10) ?? ""
		const key = [date, entry.preferredTime ?? "", entry.preferredStylist ?? "any"]
			.join("|")
			.toLowerCase()
		queueSizes.set(key, (queueSizes.get(key) ?? 0) + 1)
	}
	return entries.map((entry) => {
		const date = entry.preferredDate?.toISOString().slice(0, 10) ?? ""
		const key = [date, entry.preferredTime ?? "", entry.preferredStylist ?? "any"]
			.join("|")
			.toLowerCase()
		const queuePosition = activeStatuses.has(entry.status) ? entry.queuePosition : null
		return {
			...entry,
			queueSize: queuePosition ? queueSizes.get(key) ?? 0 : null,
			queuePositionLabel: queuePosition
				? formatQueuePosition(queuePosition)
				: "",
		}
	})
}

function formatQueuePosition(position: number): string {
	const remainder100 = position % 100
	if (remainder100 >= 11 && remainder100 <= 13) return `${position}th`
	switch (position % 10) {
		case 1: return `${position}st`
		case 2: return `${position}nd`
		case 3: return `${position}rd`
		default: return `${position}th`
	}
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
			select: {
				status: true,
				linkedBookingId: true,
				linkedBooking: { select: { status: true } },
				preferredDate: true,
				preferredTime: true,
				preferredStylist: true,
			},
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
		if (
			status === WaitlistStatus.CANCELLED &&
			entry.linkedBookingId &&
			entry.linkedBooking?.status === "WAITLISTED"
		) {
			const bookingUpdate = await transaction.booking.updateMany({
				where: {
					id: entry.linkedBookingId,
					tenantId: membership.tenantId,
					status: "WAITLISTED",
				},
				data: { status: "CANCELLED" },
			})
			if (bookingUpdate.count !== 1)
				throw new MerchantWaitlistError(
					"The linked waitlisted booking changed before cancellation completed.",
				)
			await transaction.adminAuditLog.create({
				data: {
					tenantId: membership.tenantId,
					actorUserId: userId,
					action: "booking.status.cancelled",
					resourceType: "booking",
					resourceId: entry.linkedBookingId,
					metadata: {
						previousStatus: "WAITLISTED",
						nextStatus: "CANCELLED",
						waitlistEntryId: entryId,
					} as Prisma.InputJsonValue,
				},
			})
		}
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
	const entry = await prisma.waitlistEntry.findUnique({
		where: { id: entryId },
		select: {
			preferredDate: true,
			preferredTime: true,
			preferredStylist: true,
		},
	})
	if (entry) {
		await recalculateWaitlistQueuePositions(membership.tenantId, entry)
	}
}
