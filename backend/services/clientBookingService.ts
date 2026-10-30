import "server-only"

import { BookingStatus, Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import { tenantAllowsPublicActions } from "@backend/services/publicTenantAccess"
import {
	notifyBookingCustomer,
	notifyNextWaitlistedCustomer,
} from "@backend/services/notificationService"

export class ClientBookingError extends Error {
	readonly code = "CLIENT_BOOKING_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "ClientBookingError"
	}
}

async function resolveTenant(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true, status: true, businessName: true },
	})
	if (!tenant || !(await tenantAllowsPublicActions(tenantSlug, tenant.status)))
		throw new ClientBookingError("This salon is not currently available.")
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true },
	})
	if (!user) throw new ClientBookingError("Your account could not be found.")
	return tenant
}

export async function cancelClientBooking(
	userId: string,
	tenantSlug: string,
	bookingId: string,
	userEmail?: string | null,
): Promise<void> {
	const tenant = await resolveTenant(userId, tenantSlug)
	const accountBookingFilter = userEmail
		? { OR: [{ userId }, { userId: null, email: userEmail.trim().toLowerCase() }] }
		: { userId }
	const releasedSlot = await prisma.$transaction(async (transaction) => {
		const booking = await transaction.booking.findFirst({
			where: { id: bookingId, tenantId: tenant.id, ...accountBookingFilter },
			select: {
				status: true,
				appointmentDate: true,
				timeLabel: true,
				stylist: { select: { name: true } },
				bookingSlot: { select: { id: true } },
			},
		})
		if (!booking) throw new ClientBookingError("Booking not found.")
		const cancellableStatuses: readonly BookingStatus[] = [
			BookingStatus.PENDING,
			BookingStatus.CONFIRMED,
			BookingStatus.WAITLISTED,
		]
		if (!cancellableStatuses.includes(booking.status))
			throw new ClientBookingError("This booking can no longer be cancelled.")
		const updated = await transaction.booking.updateMany({
			where: {
				id: bookingId,
				tenantId: tenant.id,
				...accountBookingFilter,
				status: booking.status,
			},
			data: {
				status: BookingStatus.CANCELLED,
				slotReleasedAt: new Date(),
				slotReleaseReason: "client-cancelled",
				slotReleaseSource: "client",
			},
		})
		if (updated.count !== 1)
			throw new ClientBookingError(
				"The booking changed before cancellation completed.",
			)
		if (booking.bookingSlot)
			await transaction.bookingSlot.update({
				where: { id: booking.bookingSlot.id },
				data: { bookingId: null, lockedUntil: null },
			})
		await transaction.activityTimeline.create({
			data: {
				tenantId: tenant.id,
				userId,
				eventType: "booking.cancelled",
				summary: "Client cancelled a booking.",
				metadata: { bookingId, source: "client" } as Prisma.InputJsonValue,
			},
		})
		return booking.bookingSlot && booking.status !== BookingStatus.WAITLISTED
			? {
					appointmentDate: booking.appointmentDate,
					timeLabel: booking.timeLabel,
					stylistName: booking.stylist?.name ?? null,
				}
			: null
	})

	// Legacy parity: after the commit, send the customer cancellation notice
	// and alert the next waiting customer that a spot opened up.
	const detail = await prisma.booking.findUnique({
		where: { id: bookingId },
		select: {
			email: true,
			phone: true,
			firstName: true,
			lastName: true,
			serviceName: true,
			appointmentDate: true,
			timeLabel: true,
		},
	})
	if (detail?.email) {
		await notifyBookingCustomer({
			tenantId: tenant.id,
			bookingId,
			businessName: tenant.businessName,
			templateKey: "booking.cancelled",
			customer: {
				firstName: detail.firstName,
				lastName: detail.lastName,
				email: detail.email,
				phone: detail.phone,
			},
			serviceName: detail.serviceName,
			appointmentDate: detail.appointmentDate,
			timeLabel: detail.timeLabel,
		})
	}
	if (releasedSlot) await notifyNextWaitlistedCustomer(tenant.id, releasedSlot)
}
