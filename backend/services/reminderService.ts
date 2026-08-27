import "server-only"

import { BookingStatus, NotificationChannel, NotificationStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	dispatchNotification,
	normalizePhoneForWhatsApp,
} from "@backend/services/notificationService"

// Legacy parity: WhatsApp reminders go out about two hours before confirmed
// appointments. The legacy Cloud Function ran every 15 minutes within a ±20
// minute window around the lead time.
const REMINDER_LEAD_TIME_MS = 2 * 60 * 60 * 1000
const REMINDER_WINDOW_MS = 20 * 60 * 1000

/** Parses "10:00 AM", "2 PM", "10:00", "18:30" into minutes since midnight. */
function parseClockMinutes(timeLabel: string): number | null {
	const text = String(timeLabel ?? "").trim().toUpperCase()
	let hour: number | null = null
	let minute = 0
	let match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/.exec(text)
	if (match) {
		hour = Number(match[1])
		minute = match[2] ? Number(match[2]) : 0
		if (match[3] === "PM" && hour !== 12) hour += 12
		if (match[3] === "AM" && hour === 12) hour = 0
	} else {
		match = /^(\d{1,2})(?::(\d{2}))?$/.exec(text)
		if (match) {
			hour = Number(match[1])
			minute = match[2] ? Number(match[2]) : 0
		}
	}
	if (hour === null || hour < 0 || hour > 23 || minute < 0 || minute > 59)
		return null
	return hour * 60 + minute
}

/**
 * Composes the UTC instant an appointment starts from its stored UTC date and
 * human-friendly time label. Returns null when the label cannot be parsed.
 */
export function getAppointmentStartUtc(
	appointmentDate: Date,
	timeLabel: string,
): Date | null {
	const minutes = parseClockMinutes(timeLabel)
	if (minutes === null) return null
	const dayIso = appointmentDate.toISOString().slice(0, 10)
	const start = new Date(`${dayIso}T00:00:00.000Z`)
	start.setUTCMinutes(start.getUTCMinutes() + minutes)
	return start
}

export interface ReminderSweepResult {
	readonly candidates: number
	readonly sent: number
	readonly failed: number
	readonly skipped: number
}

/**
 * Sends the ~2-hour WhatsApp reminder for confirmed appointments, mirroring
 * the legacy `sendUpcomingBookingWhatsAppReminders` scheduled function. Each
 * booking is reminded at most once per slot thanks to idempotent deliveries.
 */
export async function runBookingReminderSweep(): Promise<ReminderSweepResult> {
	const nowMs = Date.now()
	const minDiffMs = REMINDER_LEAD_TIME_MS - REMINDER_WINDOW_MS
	const maxDiffMs = REMINDER_LEAD_TIME_MS + REMINDER_WINDOW_MS

	const todayIso = new Date(nowMs).toISOString().slice(0, 10)
	const todayStart = new Date(`${todayIso}T00:00:00.000Z`)
	const rangeEnd = new Date(todayStart.getTime() + 2 * 24 * 60 * 60 * 1000)

	const bookings = await prisma.booking.findMany({
		where: {
			status: BookingStatus.CONFIRMED,
			appointmentDate: { gte: todayStart, lt: rangeEnd },
		},
		orderBy: { appointmentDate: "asc" },
		select: {
			id: true,
			tenantId: true,
			userId: true,
			firstName: true,
			lastName: true,
			phone: true,
			serviceName: true,
			appointmentDate: true,
			timeLabel: true,
			tenant: { select: { businessName: true } },
		},
	})

	const result = { candidates: bookings.length, sent: 0, failed: 0, skipped: 0 }

	for (const booking of bookings) {
		const start = getAppointmentStartUtc(booking.appointmentDate, booking.timeLabel)
		if (!start) {
			result.skipped += 1
			continue
		}
		const diffMs = start.getTime() - nowMs
		if (diffMs < minDiffMs || diffMs > maxDiffMs) continue

		if (!booking.phone || !normalizePhoneForWhatsApp(booking.phone)) {
			result.skipped += 1
			continue
		}

		const outcome = await dispatchNotification({
			tenantId: booking.tenantId,
			userId: booking.userId,
			bookingId: booking.id,
			channel: NotificationChannel.WHATSAPP,
			templateKey: "booking.reminder",
			destination: booking.phone,
			idempotencyKeySuffix: booking.id,
			skipIfAlreadySent: true,
			subject: {
				businessName: booking.tenant.businessName,
				firstName: booking.firstName,
				lastName: booking.lastName,
				serviceName: booking.serviceName,
				appointmentDate: booking.appointmentDate.toISOString().slice(0, 10),
				timeLabel: booking.timeLabel,
			},
		})
		if (outcome.status === NotificationStatus.SENT) result.sent += 1
		else result.failed += 1
	}

	return result
}