import "server-only"

import { BookingStatus, Prisma, WaitlistStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
	type TenantMembershipContext,
} from "@backend/services/authorization"

export class MerchantWaitlistConversionError extends Error {
	readonly code = "MERCHANT_WAITLIST_CONVERSION_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantWaitlistConversionError"
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
	if (!tenant) throw new MerchantWaitlistConversionError("Store not found.")
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

export async function convertWaitlistEntryToBooking(
	userId: string,
	tenantSlug: string,
	entryId: string,
): Promise<{ readonly bookingId: string }> {
	const membership = await getMembership(userId, tenantSlug)
	assertTenantPermission(membership, "canManageBookings")

	try {
		return await prisma.$transaction(async (transaction) => {
			const entry = await transaction.waitlistEntry.findFirst({
				where: { id: entryId, tenantId: membership.tenantId },
				select: {
					id: true,
					userId: true,
					serviceName: true,
					preferredDate: true,
					preferredTime: true,
					preferredStylist: true,
					email: true,
					phone: true,
					status: true,
					linkedBookingId: true,
				},
			})
			if (!entry)
				throw new MerchantWaitlistConversionError("Waitlist entry not found.")
			if (
				entry.status === WaitlistStatus.CANCELLED ||
				entry.status === WaitlistStatus.BOOKED
			) {
				throw new MerchantWaitlistConversionError(
					"This waitlist entry is no longer available.",
				)
			}
			if (!entry.preferredDate || !entry.preferredTime) {
				throw new MerchantWaitlistConversionError(
					"A preferred date and time are required before booking.",
				)
			}

			const stylist = entry.preferredStylist
				? await transaction.stylist.findFirst({
						where: {
							tenantId: membership.tenantId,
							name: entry.preferredStylist,
							active: true,
						},
						select: { id: true },
					})
				: null
			const slotKey = `${entry.preferredDate.toISOString().slice(0, 10)}:${entry.preferredTime}:${stylist?.id ?? "general"}`
			const slot = await transaction.bookingSlot.findUnique({
				where: { tenantId_slotKey: { tenantId: membership.tenantId, slotKey } },
				select: { id: true, bookingId: true },
			})
			if (slot?.bookingId && slot.bookingId !== entry.linkedBookingId) {
				throw new MerchantWaitlistConversionError(
					"That preferred appointment slot is no longer available.",
				)
			}

			let bookingId = entry.linkedBookingId
			if (bookingId) {
				const booking = await transaction.booking.findFirst({
					where: { id: bookingId, tenantId: membership.tenantId },
					select: {
						id: true,
						status: true,
						bookingSlot: { select: { id: true } },
					},
				})
				if (!booking)
					throw new MerchantWaitlistConversionError("Linked booking not found.")
				if (
					booking.status !== BookingStatus.WAITLISTED &&
					booking.status !== BookingStatus.PENDING
				) {
					throw new MerchantWaitlistConversionError(
						"Linked booking cannot be confirmed from the waitlist.",
					)
				}
				await transaction.booking.update({
					where: { id: booking.id },
					data: {
						status: BookingStatus.CONFIRMED,
						appointmentDate: entry.preferredDate,
						timeLabel: entry.preferredTime,
						stylistId: stylist?.id,
					},
				})
				if (
					booking.bookingSlot &&
					(!slot || slot.id !== booking.bookingSlot.id)
				) {
					await transaction.bookingSlot.update({
						where: { id: booking.bookingSlot.id },
						data: { bookingId: null, lockedUntil: null },
					})
				}
			} else {
				const booking = await transaction.booking.create({
					data: {
						tenantId: membership.tenantId,
						userId: entry.userId,
						firstName: entry.email.split("@")[0] || "Waitlist",
						lastName: "Client",
						email: entry.email,
						phone: entry.phone,
						serviceName: entry.serviceName,
						appointmentDate: entry.preferredDate,
						timeLabel: entry.preferredTime,
						stylistId: stylist?.id,
						status: BookingStatus.CONFIRMED,
					},
					select: { id: true },
				})
				bookingId = booking.id
			}

			if (slot) {
				await transaction.bookingSlot.update({
					where: { id: slot.id },
					data: { bookingId, lockedUntil: null },
				})
			} else {
				await transaction.bookingSlot.create({
					data: {
						tenantId: membership.tenantId,
						slotKey,
						date: entry.preferredDate,
						timeLabel: entry.preferredTime,
						bookingId,
					},
				})
			}

			await transaction.waitlistEntry.update({
				where: { id: entry.id },
				data: { status: WaitlistStatus.BOOKED, linkedBookingId: bookingId },
			})
			await transaction.waitlistEntry.updateMany({
				where: {
					tenantId: membership.tenantId,
					status: { in: [WaitlistStatus.WAITING, WaitlistStatus.CONTACTED] },
					queuePosition: {
						gt:
							(
								await transaction.waitlistEntry.findUnique({
									where: { id: entry.id },
									select: { queuePosition: true },
								})
							)?.queuePosition ?? 0,
					},
				},
				data: { queuePosition: { decrement: 1 } },
			})
			await transaction.adminAuditLog.create({
				data: {
					tenantId: membership.tenantId,
					actorUserId: userId,
					action: "waitlist.converted-to-booking",
					resourceType: "waitlist",
					resourceId: entry.id,
					metadata: { bookingId } as Prisma.InputJsonValue,
				},
			})
			return { bookingId: bookingId as string }
		})
	} catch (error) {
		if (error instanceof MerchantWaitlistConversionError) throw error
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new MerchantWaitlistConversionError(
				"That appointment slot is no longer available.",
			)
		}
		throw new MerchantWaitlistConversionError(
			"The waitlist entry could not be converted.",
		)
	}
}
