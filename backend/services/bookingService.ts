import "server-only"

import { BookingStatus, NotificationChannel, Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	consumeRateLimit,
	hashRateLimitSubject,
} from "@backend/services/rateLimit"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import { dispatchNotification } from "@backend/services/notificationService"
import { resolveBookingPaymentPlan } from "@shared/constants/bookingPayments"
import type { BookingRequestInput } from "@shared/validation/booking"

export class BookingRequestError extends Error {
	readonly code = "BOOKING_REQUEST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "BookingRequestError"
	}
}

export class BookingSlotUnavailableError extends Error {
	readonly code = "BOOKING_SLOT_UNAVAILABLE" as const

	constructor() {
		super(
			"That appointment time is no longer available. Please choose another time.",
		)
		this.name = "BookingSlotUnavailableError"
	}
}

function toUtcDate(date: string): Date {
	return new Date(`${date}T00:00:00.000Z`)
}

export async function createPublicBooking(
	input: BookingRequestInput,
	remoteAddress?: string,
	userId?: string,
): Promise<{
	readonly id: string
	readonly status: BookingStatus
	readonly payment?: {
		readonly id: string
		readonly status: string
		readonly mode: string
		readonly amountMinor: number
		readonly currency: string
	}
}> {
	if (!(await verifyTurnstileToken(input.turnstileToken, remoteAddress))) {
		throw new BookingRequestError(
			"Security verification failed. Please try again.",
		)
	}

	const tenant = await prisma.tenant.findUnique({
		where: { slug: input.tenantSlug.toLowerCase() },
		select: {
			id: true,
			status: true,
			businessName: true,
			currency: true,
			settings: {
				select: {
					emailPrimary: true,
					emailBookings: true,
					bookingPaymentsEnabled: true,
					bookingPaymentModes: true,
					bookingDepositPercent: true,
				},
			},
			services: {
				where: input.serviceId
					? { id: input.serviceId, enabled: true }
					: undefined,
				select: { id: true, name: true, orderOnly: true, priceMinor: true },
			},
			stylists: {
				where: input.stylistId
					? { id: input.stylistId, active: true }
					: undefined,
				select: { id: true },
			},
		},
	})

	if (!tenant || tenant.status !== "ACTIVE") {
		throw new BookingRequestError(
			"This salon is not currently accepting online bookings.",
		)
	}

	const service = input.serviceId ? tenant.services[0] : undefined
	if (input.serviceId && (!service || service.orderOnly)) {
		throw new BookingRequestError(
			"That service is not available for online booking.",
		)
	}
	if (input.stylistId && tenant.stylists.length !== 1) {
		throw new BookingRequestError("That stylist is not available for booking.")
	}
	let paymentPlan
	try {
		paymentPlan = resolveBookingPaymentPlan({
			enabled: tenant.settings?.bookingPaymentsEnabled === true,
			configuredModes: tenant.settings?.bookingPaymentModes,
			depositPercent: tenant.settings?.bookingDepositPercent ?? 50,
			servicePriceMinor: service?.priceMinor,
			orderOnly: service?.orderOnly === true,
			requestedMode: service ? input.paymentMode : undefined,
		})
	} catch (error) {
		if (error instanceof Error)
			throw new BookingRequestError(error.message)
		throw new BookingRequestError("The selected payment option is unavailable.")
	}

	const subjectKey = hashRateLimitSubject(
		`${remoteAddress ?? "unknown"}:${input.email}`,
	)
	await consumeRateLimit({
		tenantId: tenant.id,
		subjectKey,
		kind: "public-booking",
		intervalMs: 30_000,
	})

	const appointmentDate = toUtcDate(input.appointmentDate)
	if (
		appointmentDate.getTime() <
		toUtcDate(new Date().toISOString().slice(0, 10)).getTime()
	) {
		throw new BookingRequestError(
			"Please choose a current or future appointment date.",
		)
	}

	const slotKey = `${input.appointmentDate}:${input.timeLabel}:${input.stylistId ?? "general"}`

	let booking: {
		readonly id: string
		readonly status: BookingStatus
		readonly payment?: {
			readonly id: string
			readonly status: string
			readonly mode: string
			readonly amountMinor: number
			readonly currency: string
		}
	}
	try {
		booking = await prisma.$transaction(async (transaction) => {
			const created = await transaction.booking.create({
				data: {
					tenantId: tenant.id,
					userId,
					serviceId: service?.id,
					stylistId: input.stylistId,
					firstName: input.firstName,
					lastName: input.lastName,
					email: input.email.toLowerCase(),
					phone: input.phone,
					serviceName: service?.name ?? input.serviceName,
					customService: input.customService,
					appointmentDate,
					timeLabel: input.timeLabel,
					status: BookingStatus.PENDING,
					specialRequests: input.specialRequests,
				},
				select: { id: true, status: true },
			})

			await transaction.bookingSlot.create({
				data: {
					tenantId: tenant.id,
					slotKey,
					date: appointmentDate,
					timeLabel: input.timeLabel,
					bookingId: created.id,
				},
			})

			const payment = paymentPlan
				? await transaction.bookingPayment.create({
						data: {
							tenantId: tenant.id,
							bookingId: created.id,
							paymentMode: paymentPlan.mode,
							amountMinor: paymentPlan.amountMinor,
							serviceTotalMinor: paymentPlan.serviceTotalMinor,
							currency: tenant.currency,
							status: paymentPlan.status,
							expiresAt: paymentPlan.expiresAt,
						},
						select: {
							id: true,
							status: true,
							paymentMode: true,
							amountMinor: true,
							currency: true,
						},
					})
				: null

			await transaction.notificationDelivery.create({
				data: {
					tenantId: tenant.id,
					bookingId: created.id,
					channel: "EMAIL" as NotificationChannel,
					templateKey: "booking.pending",
					destination: input.email.toLowerCase(),
					idempotencyKey: `manual:${tenant.id}:booking.pending:${created.id}`,
				},
			})
			return {
				...created,
				payment: payment
					? {
							id: payment.id,
							status: payment.status,
							mode: payment.paymentMode,
							amountMinor: payment.amountMinor,
							currency: payment.currency,
						}
					: undefined,
			}
		})
	} catch (error) {
		if (error instanceof BookingRequestError) throw error
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			throw new BookingSlotUnavailableError()
		}
		throw new BookingRequestError(
			"The booking could not be created. Please try again.",
		)
	}

	// Notify the customer (email is queued in the transaction above and now sent)
	// and the salon, matching the legacy Firebase booking automation.
	const subject = {
		businessName: tenant.businessName,
		firstName: input.firstName,
		lastName: input.lastName,
		serviceName: service?.name ?? input.serviceName,
		appointmentDate: input.appointmentDate,
		timeLabel: input.timeLabel,
		phone: input.phone,
	}

	await Promise.allSettled([
		dispatchNotification({
			tenantId: tenant.id,
			userId,
			bookingId: booking.id,
			channel: NotificationChannel.EMAIL,
			templateKey: "booking.pending",
			destination: input.email.toLowerCase(),
			subject,
		}),
		...(input.phone
			? [
					dispatchNotification({
						tenantId: tenant.id,
						userId,
						bookingId: booking.id,
						channel: NotificationChannel.WHATSAPP,
						templateKey: "booking.pending",
						destination: input.phone,
						subject,
					}),
				]
			: []),
	])

	const salonEmail =
		tenant.settings?.emailBookings || tenant.settings?.emailPrimary
	if (salonEmail) {
		await dispatchNotification({
			tenantId: tenant.id,
			bookingId: booking.id,
			channel: NotificationChannel.EMAIL,
			templateKey: "booking.enquiry",
			destination: salonEmail,
			subject: {
				...subject,
				contactName: `${input.firstName} ${input.lastName}`.trim(),
				contactEmail: input.email.toLowerCase(),
			},
		}).catch(() => {})
	}

	return {
		id: booking.id,
		status: booking.status,
		payment: booking.payment,
	}
}
