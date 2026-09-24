import "server-only"

import { prisma } from "@backend/db/prisma"
import {
	requestDarajaStkPush,
	verifyDarajaPayment,
} from "@backend/services/darajaPaymentService"
import { notifyBookingCustomer } from "@backend/services/notificationService"
import {
	resolveBookingPaymentPlan,
	type ResolvedBookingPaymentPlan,
} from "@shared/constants/bookingPayments"
import { normalizeKenyanMpesaPhone } from "@shared/validation/mpesa"

const PAYMENT_EXPIRY_MS = 15 * 60 * 1000

export class BookingPaymentError extends Error {
	readonly code = "BOOKING_PAYMENT_ERROR" as const

	constructor(message: string) {
		super(message)
		this.name = "BookingPaymentError"
	}
}

export type BookingPaymentPlan = ResolvedBookingPaymentPlan

export async function requestBookingPayment(
	tenantSlug: string,
	paymentId: string,
	phoneInput: string,
) {
	const phoneNumber = normalizeKenyanMpesaPhone(phoneInput)
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
			expiresAt: true,
			checkoutRequestId: true,
			booking: { select: { status: true, phone: true } },
		},
	})
	if (!payment) throw new BookingPaymentError("Booking payment not found.")
	if (payment.paymentMode === "after_service")
		return { status: "deferred" as const, paymentId: payment.id }
	if (payment.booking.status === "CANCELLED" || payment.booking.status === "EXPIRED")
		throw new BookingPaymentError("This booking is no longer payable.")
	if (payment.expiresAt && payment.expiresAt <= new Date()) {
		await expireBookingPayment(payment.id)
		throw new BookingPaymentError("This payment request has expired.")
	}
	if (payment.status === "succeeded")
		return { status: "succeeded" as const, paymentId: payment.id }
	if (payment.status === "failed" || payment.status === "expired") {
		const replacement = await prisma.$transaction(async (transaction) => {
			const active = await transaction.bookingPayment.findFirst({
				where: { bookingId: payment.bookingId, status: "pending" },
				select: { id: true },
			})
			if (active) return active
			return transaction.bookingPayment.create({
				data: {
					tenantId: payment.tenantId,
					bookingId: payment.bookingId,
					paymentMode: payment.paymentMode,
					amountMinor: payment.amountMinor,
					serviceTotalMinor: payment.serviceTotalMinor,
					currency: payment.currency,
					status: "pending",
					expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MS),
				},
				select: { id: true },
			})
		})
		return requestBookingPayment(tenantSlug, replacement.id, phoneInput)
	}
	if (payment.status !== "pending")
		throw new BookingPaymentError("This payment request is no longer active.")
	if (payment.checkoutRequestId)
		return { status: "pending" as const, paymentId: payment.id }
	if (normalizeKenyanMpesaPhone(payment.booking.phone) !== phoneNumber)
		throw new BookingPaymentError(
			"Use the same phone number entered for this booking.",
		)

	try {
		const result = await requestDarajaStkPush(
			phoneNumber,
			payment.amountMinor,
			`BOOKING-${payment.id}`,
			"Salon service booking payment",
		)
		await prisma.bookingPayment.update({
			where: { id: payment.id },
			data: {
				phoneNumber: result.phoneNumber,
				merchantRequestId: result.merchantRequestId,
				checkoutRequestId: result.checkoutRequestId,
			},
		})
		return { status: "pending" as const, paymentId: payment.id }
	} catch (error) {
		await expireBookingPayment(payment.id, error instanceof Error ? error.message : "M-Pesa request failed.")
		throw new BookingPaymentError(
			error instanceof Error
				? error.message
				: "The M-Pesa payment request could not be started.",
		)
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
