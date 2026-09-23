import "server-only"

import { BookingStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import { notifyNextWaitlistedCustomer } from "@backend/services/notificationService"

const NAIROBI_UTC_OFFSET_MINUTES = 3 * 60
const EXPIRY_GRACE_MS = 2 * 60 * 60 * 1000

export interface BookingSlotExpirySweepResult {
	readonly candidates: number
	readonly released: number
	readonly skipped: number
	readonly failed: number
}

function parseTimeLabel(value: string): number | null {
	const text = value.trim().toUpperCase()
	let match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/.exec(text)
	if (match) {
		let hour = Number(match[1])
		const minute = Number(match[2] ?? 0)
		if (match[3] === "PM" && hour !== 12) hour += 12
		if (match[3] === "AM" && hour === 12) hour = 0
		if (hour > 23 || minute > 59) return null
		return hour * 60 + minute
	}
	match = /^(\d{1,2})(?::(\d{2}))?$/.exec(text)
	if (!match) return null
	const hour = Number(match[1])
	const minute = Number(match[2] ?? 0)
	return hour <= 23 && minute <= 59 ? hour * 60 + minute : null
}

function appointmentStartUtc(date: Date, timeLabel: string): Date | null {
	const minutes = parseTimeLabel(timeLabel)
	if (minutes === null) return null
	const day = date.toISOString().slice(0, 10)
	const start = new Date(`${day}T00:00:00.000Z`)
	start.setUTCMinutes(minutes - NAIROBI_UTC_OFFSET_MINUTES)
	return start
}

function nextAutoReleaseStatus(status: BookingStatus): BookingStatus | null {
	if (status === BookingStatus.PENDING) return BookingStatus.EXPIRED
	if (status === BookingStatus.CONFIRMED) return BookingStatus.NO_SHOW
	return null
}

async function releaseExpiredSlot(slotId: string, now: Date): Promise<{
	released: boolean
	tenantId?: string
	appointmentDate?: Date
	timeLabel?: string
}> {
	return prisma.$transaction(async (transaction) => {
		const slot = await transaction.bookingSlot.findUnique({
			where: { id: slotId },
			select: {
				id: true,
				tenantId: true,
				bookingId: true,
				date: true,
				timeLabel: true,
				booking: {
					select: {
						id: true,
						status: true,
						appointmentDate: true,
						timeLabel: true,
					},
				},
			},
		})
		if (!slot?.bookingId || !slot.booking) return { released: false }

		const start = appointmentStartUtc(
			slot.booking.appointmentDate,
			slot.booking.timeLabel || slot.timeLabel,
		)
		if (!start || start.getTime() + EXPIRY_GRACE_MS > now.getTime())
			return { released: false }

		const nextStatus = nextAutoReleaseStatus(slot.booking.status)
		const terminalStatuses: BookingStatus[] = [
			BookingStatus.COMPLETED,
			BookingStatus.CANCELLED,
			BookingStatus.EXPIRED,
			BookingStatus.NO_SHOW,
		]
		const terminalStatus = terminalStatuses.includes(slot.booking.status)
		if (!nextStatus && !terminalStatus) return { released: false }

		const updated = await transaction.bookingSlot.updateMany({
			where: { id: slot.id, bookingId: slot.bookingId },
			data: { bookingId: null, lockedUntil: null, updatedAt: now },
		})
		if (updated.count !== 1) return { released: false }

		await transaction.booking.update({
			where: { id: slot.booking.id },
			data: {
				releasedSlotId: slot.id,
				slotReleasedAt: now,
				slotReleaseReason:
					nextStatus === BookingStatus.EXPIRED
						? "expired"
						: nextStatus === BookingStatus.NO_SHOW
							? "no_show"
							: `already-${slot.booking.status.toLowerCase()}`,
				slotReleaseSource: "schedule",
				...(nextStatus
					? {
							status: nextStatus,
							previousStatusBeforeAutoRelease: slot.booking.status,
							bookingAutoStatus: nextStatus,
							autoReleasedAt: now,
							...(nextStatus === BookingStatus.EXPIRED
								? { expiredAt: now }
								: { noShowAt: now }),
						}
					: {}),
			},
		})

		return {
			released: true,
			tenantId: slot.tenantId,
			appointmentDate: slot.booking.appointmentDate,
			timeLabel: slot.booking.timeLabel || slot.timeLabel,
		}
	})
}

export async function runBookingSlotExpirySweep(
	now = new Date(),
): Promise<BookingSlotExpirySweepResult> {
	const slots = await prisma.bookingSlot.findMany({
		where: { bookingId: { not: null }, date: { lte: now } },
		take: 500,
		select: { id: true },
	})
	const result = { candidates: slots.length, released: 0, skipped: 0, failed: 0 }
	const openingsToNotify = new Map<
		string,
		{ readonly appointmentDate: Date; readonly timeLabel: string }
	>()

	for (const slot of slots) {
		try {
			const outcome = await releaseExpiredSlot(slot.id, now)
			if (outcome.released) {
				result.released += 1
				if (outcome.tenantId && outcome.appointmentDate && outcome.timeLabel) {
					openingsToNotify.set(`${outcome.tenantId}:${slot.id}`, {
						appointmentDate: outcome.appointmentDate,
						timeLabel: outcome.timeLabel,
					})
				}
			} else {
				result.skipped += 1
			}
		} catch (error) {
			result.failed += 1
			console.error("Booking slot expiry failed", { slotId: slot.id, error })
		}
	}

	await Promise.allSettled(
		[...openingsToNotify].map(([key, opening]) =>
			notifyNextWaitlistedCustomer(key.split(":", 1)[0], opening),
		),
	)
	return result
}
