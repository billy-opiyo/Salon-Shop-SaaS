import "server-only"

import { BookingStatus, Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import { notifyBookingCustomer } from "@backend/services/notificationService"

export class ClientRescheduleError extends Error {
	readonly code = "CLIENT_RESCHEDULE_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "ClientRescheduleError"
	}
}

export async function rescheduleClientBooking(
	userId: string,
	tenantSlug: string,
	input: {
		bookingId: string
		appointmentDate: string
		timeLabel: string
		stylistId?: string
	},
): Promise<void> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true, status: true, businessName: true },
	})
	if (!tenant || tenant.status !== "ACTIVE")
		throw new ClientRescheduleError("This salon is not currently available.")
	const appointmentDate = new Date(`${input.appointmentDate}T00:00:00.000Z`)
	if (
		Number.isNaN(appointmentDate.getTime()) ||
		appointmentDate.getTime() <
			new Date(
				`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
			).getTime()
	)
		throw new ClientRescheduleError(
			"Please choose a current or future appointment date.",
		)
	await prisma
		.$transaction(async (transaction) => {
			const booking = await transaction.booking.findFirst({
				where: { id: input.bookingId, tenantId: tenant.id, userId },
				select: { status: true, bookingSlot: { select: { id: true } } },
			})
			const reschedulableStatuses: readonly BookingStatus[] = [
				BookingStatus.PENDING,
				BookingStatus.CONFIRMED,
			]
			if (!booking || !reschedulableStatuses.includes(booking.status))
				throw new ClientRescheduleError("This booking cannot be rescheduled.")
			if (input.stylistId) {
				const stylist = await transaction.stylist.findFirst({
					where: { id: input.stylistId, tenantId: tenant.id, active: true },
					select: { id: true },
				})
				if (!stylist)
					throw new ClientRescheduleError("That stylist is not available.")
			}
			const slotKey = `${input.appointmentDate}:${input.timeLabel}:${input.stylistId ?? "general"}`
			const currentSlot = booking.bookingSlot
				? await transaction.bookingSlot.findUnique({
						where: { id: booking.bookingSlot.id },
						select: { slotKey: true },
					})
				: null
			if (currentSlot?.slotKey === slotKey)
				throw new ClientRescheduleError(
					"Please choose a different appointment time.",
				)
			await transaction.bookingSlot.create({
				data: {
					tenantId: tenant.id,
					slotKey,
					date: appointmentDate,
					timeLabel: input.timeLabel,
					bookingId: input.bookingId,
				},
			})
			if (booking.bookingSlot)
				await transaction.bookingSlot.update({
					where: { id: booking.bookingSlot.id },
					data: { bookingId: null, lockedUntil: null },
				})
			await transaction.booking.update({
				where: { id: input.bookingId },
				data: {
					appointmentDate,
					timeLabel: input.timeLabel,
					stylistId: input.stylistId || null,
				},
			})
			await transaction.activityTimeline.create({
				data: {
					tenantId: tenant.id,
					userId,
					eventType: "booking.rescheduled",
					summary: "Client rescheduled a booking.",
					metadata: {
						bookingId: input.bookingId,
						appointmentDate: input.appointmentDate,
						timeLabel: input.timeLabel,
					} as Prisma.InputJsonValue,
				},
			})
		})
		.catch((error) => {
			if (error instanceof ClientRescheduleError) throw error
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			)
				throw new ClientRescheduleError(
					"That appointment time is no longer available.",
				)
			throw new ClientRescheduleError("The booking could not be rescheduled.")
		})

	// Legacy parity: after the commit, email/WhatsApp the confirmed new time.
	const detail = await prisma.booking.findUnique({
		where: { id: input.bookingId },
		select: {
			email: true,
			phone: true,
			firstName: true,
			lastName: true,
			serviceName: true,
		},
	})
	if (detail?.email) {
		await notifyBookingCustomer({
			tenantId: tenant.id,
			bookingId: input.bookingId,
			businessName: tenant.businessName,
			templateKey: "booking.rescheduled",
			customer: {
				firstName: detail.firstName,
				lastName: detail.lastName,
				email: detail.email,
				phone: detail.phone,
			},
			serviceName: detail.serviceName,
			appointmentDate: new Date(`${input.appointmentDate}T00:00:00.000Z`),
			timeLabel: input.timeLabel,
		})
	}
}
