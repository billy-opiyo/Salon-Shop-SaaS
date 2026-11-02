import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	verifyDarajaPayment,
} from "@backend/services/darajaPaymentService"
import { notifyBookingCustomer } from "@backend/services/notificationService"
import { consumeRateLimit, hashRateLimitSubject } from "@backend/services/rateLimit"
import {
	type ResolvedBookingPaymentPlan,
} from "@shared/constants/bookingPayments"
import { normalizeKenyanMpesaPhone } from "@shared/validation/mpesa"

export class BookingPaymentError extends Error {
	readonly code = "BOOKING_PAYMENT_ERROR" as const

	constructor(message: string) {
		super(message)
		this.name = "BookingPaymentError"
	}
}

export type BookingPaymentPlan = ResolvedBookingPaymentPlan

export class ManualBookingReceiptError extends Error {
	readonly code = "MANUAL_BOOKING_RECEIPT_ERROR" as const

	constructor(message: string) {
		super(message)
		this.name = "ManualBookingReceiptError"
	}
}

export async function submitManualBookingPaymentReceipt({
	tenantSlug,
	paymentId,
	phoneInput,
	receiptInput,
	remoteAddress,
}: {
	readonly tenantSlug: string
	readonly paymentId: string
	readonly phoneInput: string
	readonly receiptInput: string
	readonly remoteAddress: string
}) {
	const receipt = receiptInput.trim().toUpperCase()
	if (!/^[A-Z0-9]{6,16}$/.test(receipt))
		throw new ManualBookingReceiptError("Enter the M-Pesa receipt code shown on your confirmation message.")
	let phoneNumber: string
	try {
		phoneNumber = normalizeKenyanMpesaPhone(phoneInput)
	} catch {
		throw new ManualBookingReceiptError("Enter the same valid Kenyan phone number used for the booking.")
	}
	const payment = await prisma.bookingPayment.findFirst({
		where: { id: paymentId, tenant: { slug: tenantSlug.trim().toLowerCase() } },
		select: {
			id: true,
			tenantId: true,
			bookingId: true,
			status: true,
			paymentMode: true,
			collectionMethod: true,
			collectionNumber: true,
			mpesaReceiptNumber: true,
		expiresAt: true,
			booking: { select: { phone: true, status: true } },
		},
	})
	if (!payment) throw new ManualBookingReceiptError("Booking payment not found.")
	if (payment.collectionMethod === "platform-stk")
		throw new ManualBookingReceiptError("This booking uses the secure M-Pesa prompt. A manual receipt is not expected.")
	if (payment.paymentMode === "after_service")
		throw new ManualBookingReceiptError("This booking is set to pay after the service.")
	if (payment.booking.status === "CANCELLED" || payment.booking.status === "EXPIRED")
		throw new ManualBookingReceiptError("This booking is no longer active.")
	if (payment.expiresAt && payment.expiresAt <= new Date()) {
		await expireBookingPayment(payment.id)
		throw new ManualBookingReceiptError("This booking payment window has expired. Please create a new booking request.")
	}
	if (payment.status !== "pending" || payment.mpesaReceiptNumber)
		throw new ManualBookingReceiptError("A receipt has already been submitted or this payment is no longer active.")
	if (normalizeKenyanMpesaPhone(payment.booking.phone) !== phoneNumber)
		throw new ManualBookingReceiptError("Use the same phone number entered for this booking.")
	await consumeRateLimit({
		tenantId: payment.tenantId,
		subjectKey: hashRateLimitSubject(`${remoteAddress}:${paymentId}`),
		kind: "manual-booking-receipt",
		intervalMs: 10_000,
	})
	try {
		await prisma.$transaction(async (transaction) => {
			const duplicate = await transaction.bookingPayment.findFirst({
				where: {
					tenantId: payment.tenantId,
					id: { not: payment.id },
					mpesaReceiptNumber: { equals: receipt, mode: "insensitive" },
				},
				select: { id: true },
			})
			if (duplicate) throw new ManualBookingReceiptError("That receipt code has already been submitted.")
			const updated = await transaction.bookingPayment.updateMany({
				where: { id: payment.id, status: "pending", mpesaReceiptNumber: null },
				data: {
					phoneNumber,
					mpesaReceiptNumber: receipt,
					resultDescription: "Manual M-Pesa receipt awaiting salon owner review.",
				},
			})
			if (updated.count !== 1)
				throw new ManualBookingReceiptError("The payment changed before the receipt was saved. Refresh and try again.")
		}, { isolationLevel: "Serializable" })
	} catch (error) {
		if (error instanceof ManualBookingReceiptError) throw error
		throw new ManualBookingReceiptError("The receipt could not be saved safely. Refresh and try again.")
	}
	return { status: "awaiting-owner-review" as const }
}

export async function requestBookingPayment(
	tenantSlug: string,
	paymentId: string,
) {
	const payment = await prisma.bookingPayment.findFirst({
		where: {
			id: paymentId,
			tenant: { slug: tenantSlug.trim().toLowerCase() },
		},
		select: {
			id: true,
			tenantId: true,
			bookingId: true,
			status: true,
			paymentMode: true,
			amountMinor: true,
			serviceTotalMinor: true,
			currency: true,
			phoneNumber: true,
			collectionMethod: true,
			collectionNumber: true,
			expiresAt: true,
			checkoutRequestId: true,
			booking: { select: { status: true, phone: true } },
		},
	})
	if (!payment) throw new BookingPaymentError("Booking payment not found.")
	if (payment.paymentMode === "after_service")
		return { status: "deferred" as const, paymentId: payment.id }
	if (payment.collectionMethod === "platform-stk") {
		if (payment.status === "succeeded")
			return { status: "succeeded" as const, paymentId: payment.id }
		if (payment.status === "pending" && payment.checkoutRequestId)
			return { status: "pending" as const, paymentId: payment.id }
		throw new BookingPaymentError(
			"This booking used an old platform payment setting. Please contact the salon to arrange payment to its own M-Pesa destination.",
		)
	}
	return {
		status: "manual" as const,
		paymentId: payment.id,
		collectionMethod: payment.collectionMethod,
		collectionNumber: payment.collectionNumber,
	}
}

export async function handleBookingDarajaCallback(payload: unknown): Promise<void> {
	const callback = payload as {
		Body?: {
			stkCallback?: {
				CheckoutRequestID?: string
				ResultCode?: number
				ResultDesc?: string
				CallbackMetadata?: {
					Item?: Array<{ Name?: string; Value?: string | number }>
				}
			}
		}
	}
	const result = callback.Body?.stkCallback
	if (!result?.CheckoutRequestID) return
	const payment = await prisma.bookingPayment.findUnique({
		where: { checkoutRequestId: result.CheckoutRequestID },
		select: {
			id: true,
			status: true,
			amountMinor: true,
			currency: true,
			phoneNumber: true,
			bookingId: true,
			serviceTotalMinor: true,
			booking: {
				select: {
					status: true,
					tenantId: true,
					firstName: true,
					lastName: true,
					email: true,
					phone: true,
					serviceName: true,
					appointmentDate: true,
					timeLabel: true,
					tenant: { select: { businessName: true } },
				},
			},
		},
	})
	if (!payment || payment.status !== "pending") return
	if (payment.booking.status === "CANCELLED" || payment.booking.status === "EXPIRED") {
		await prisma.bookingPayment.updateMany({
			where: { id: payment.id, status: "pending" },
			data: { status: "failed", resultDescription: "Booking is no longer active", completedAt: new Date() },
		})
		return
	}

	const paid = result.ResultCode === 0
	const metadata = result.CallbackMetadata?.Item ?? []
	const receipt = metadata.find((item) => item.Name === "MpesaReceiptNumber")?.Value
	const amount = metadata.find((item) => item.Name === "Amount")?.Value
	const phoneNumber = metadata.find((item) => item.Name === "PhoneNumber")?.Value
	if (paid) {
		if (
			!receipt ||
			Number(amount) !== Math.ceil(payment.amountMinor / 100) ||
			!payment.phoneNumber ||
			String(phoneNumber) !== payment.phoneNumber
		)
			throw new BookingPaymentError(
				"Daraja callback payment details do not match the booking payment.",
			)
		await verifyDarajaPayment(result.CheckoutRequestID)
	}

	await prisma.$transaction(async (transaction) => {
		const claimed = await transaction.bookingPayment.updateMany({
			where: { id: payment.id, status: "pending" },
			data: {
				status: paid ? "succeeded" : "failed",
				mpesaReceiptNumber: receipt ? String(receipt) : null,
				resultDescription: result.ResultDesc,
				completedAt: new Date(),
				rawCallback: payload as object,
			},
		})
		if (claimed.count !== 1) return
		if (!paid) {
			await transaction.booking.updateMany({
				where: { id: payment.bookingId, status: "PENDING" },
				data: { status: "EXPIRED", expiredAt: new Date() },
			})
			await transaction.bookingSlot.updateMany({
				where: { bookingId: payment.bookingId },
				data: { bookingId: null, lockedUntil: null },
			})
			return
		}

		await transaction.booking.updateMany({
			where: { id: payment.bookingId, status: "PENDING" },
			data: { status: "CONFIRMED" },
		})
		const balanceMinor = payment.serviceTotalMinor - payment.amountMinor
		if (balanceMinor > 0) {
			await transaction.bookingPayment.create({
				data: {
					tenantId: payment.booking.tenantId,
					bookingId: payment.bookingId,
					paymentMode: "after_service",
					amountMinor: balanceMinor,
					serviceTotalMinor: payment.serviceTotalMinor,
					currency: payment.currency,
					status: "deferred",
				},
			})
		}
	})
	if (paid && payment.booking.email) {
		await notifyBookingCustomer({
			tenantId: payment.booking.tenantId,
			bookingId: payment.bookingId,
			businessName: payment.booking.tenant.businessName,
			templateKey: "booking.payment_confirmed",
			customer: {
				firstName: payment.booking.firstName,
				lastName: payment.booking.lastName,
				email: payment.booking.email,
				phone: payment.booking.phone,
			},
			serviceName: payment.booking.serviceName,
			appointmentDate: payment.booking.appointmentDate,
			timeLabel: payment.booking.timeLabel,
		})
	}
}

export async function expireBookingPayment(
	paymentId: string,
	reason = "Payment window expired",
): Promise<boolean> {
	return prisma.$transaction(async (transaction) => {
		const payment = await transaction.bookingPayment.findUnique({
			where: { id: paymentId },
			select: { bookingId: true, status: true },
		})
		if (!payment || payment.status !== "pending") return false
		const updated = await transaction.bookingPayment.updateMany({
			where: { id: paymentId, status: "pending" },
			data: { status: "expired", resultDescription: reason },
		})
		if (updated.count !== 1) return false
		await transaction.booking.updateMany({
			where: { id: payment.bookingId, status: "PENDING" },
			data: { status: "EXPIRED", expiredAt: new Date() },
		})
		await transaction.bookingSlot.updateMany({
			where: { bookingId: payment.bookingId },
			data: { bookingId: null, lockedUntil: null },
		})
		return true
	})
}

export async function expirePendingBookingPayments(now = new Date()) {
	const payments = await prisma.bookingPayment.findMany({
		where: { status: "pending", expiresAt: { lte: now } },
		take: 500,
		select: { id: true },
	})
	let expired = 0
	for (const payment of payments) {
		if (await expireBookingPayment(payment.id)) expired += 1
	}
	return { candidates: payments.length, expired }
}
