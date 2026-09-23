import "server-only"

import { WaitlistStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"

export class ClientWaitlistError extends Error {
	readonly code = "CLIENT_WAITLIST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "ClientWaitlistError"
	}
}

export interface ClientWaitlistQueueInfo {
	readonly active: boolean
	readonly position: number | null
	readonly label: string
	readonly size: number | null
	readonly status: string
	readonly slotKey: string
	readonly waitlistId: string
	readonly bookingId: string
	readonly source: "live-waitlist-calc"
}

const ACTIVE_QUEUE_STATUSES: WaitlistStatus[] = [
	WaitlistStatus.WAITING,
	WaitlistStatus.NOTIFIED,
	WaitlistStatus.CONTACTED,
	WaitlistStatus.NOTIFICATION_FAILED,
]

function ordinal(value: number | null): string {
	if (!value || value < 1) return ""
	const mod100 = value % 100
	if (mod100 >= 11 && mod100 <= 13) return `${value}th`
	switch (value % 10) {
		case 1:
			return `${value}st`
		case 2:
			return `${value}nd`
		case 3:
			return `${value}rd`
		default:
			return `${value}th`
	}
}

function normalizeSlug(value: string): string {
	return value.trim().toLowerCase()
}

function buildSlotKey(
	preferredDate: Date | null,
	preferredTime: string | null,
	preferredStylist: string | null,
): string {
	if (!preferredDate || !preferredTime) return ""
	return [
		preferredDate.toISOString().slice(0, 10),
		preferredTime.trim(),
		preferredStylist?.trim() || "any",
	].join(":")
}

function emptyQueueInfo(
	status: string,
	waitlistId: string,
	bookingId: string,
	slotKey = "",
): ClientWaitlistQueueInfo {
	return {
		active: false,
		position: null,
		label: "",
		size: null,
		status,
		slotKey,
		waitlistId,
		bookingId,
		source: "live-waitlist-calc",
	}
}

export async function getClientWaitlistQueueInfo(input: {
	readonly userId: string
	readonly tenantSlug: string
	readonly bookingId?: string
	readonly waitlistId?: string
}): Promise<ClientWaitlistQueueInfo> {
	const bookingId = input.bookingId?.trim() ?? ""
	const requestedWaitlistId = input.waitlistId?.trim() ?? ""
	if (!bookingId && !requestedWaitlistId) {
		throw new ClientWaitlistError("Booking ID or waitlist ID is required.")
	}

	const tenant = await prisma.tenant.findUnique({
		where: { slug: normalizeSlug(input.tenantSlug) },
		select: { id: true, status: true },
	})
	if (!tenant || tenant.status !== "ACTIVE") {
		throw new ClientWaitlistError("This salon is not currently available.")
	}

	const user = await prisma.user.findUnique({
		where: { id: input.userId },
		select: { email: true },
	})
	if (!user) throw new ClientWaitlistError("Your account could not be found.")

	const booking = bookingId
		? await prisma.booking.findFirst({
				where: {
					id: bookingId,
					tenantId: tenant.id,
					OR: [{ userId: input.userId }, { email: user.email.toLowerCase() }],
				},
				select: {
					id: true,
					waitlistEntry: {
						select: {
							id: true,
							status: true,
							preferredDate: true,
							preferredTime: true,
							preferredStylist: true,
						},
					},
				},
			})
		: null

	if (bookingId && !booking) {
		throw new ClientWaitlistError("Booking no longer exists.")
	}

	if (booking?.waitlistEntry && requestedWaitlistId && booking.waitlistEntry.id !== requestedWaitlistId) {
		throw new ClientWaitlistError("This waitlist request is not linked to your booking.")
	}

	const waitlistId = booking?.waitlistEntry?.id ?? requestedWaitlistId
	if (!waitlistId) {
		throw new ClientWaitlistError("This booking is not linked to a waitlist request.")
	}

	const entry = await prisma.waitlistEntry.findFirst({
		where: {
			id: waitlistId,
			tenantId: tenant.id,
			OR: [{ userId: input.userId }, { email: user.email.toLowerCase() }],
		},
		select: {
			id: true,
			status: true,
			preferredDate: true,
			preferredTime: true,
			preferredStylist: true,
			linkedBookingId: true,
		},
	})
	if (!entry) throw new ClientWaitlistError("Waitlist request no longer exists.")
	if (bookingId && entry.linkedBookingId && entry.linkedBookingId !== bookingId) {
		throw new ClientWaitlistError("This waitlist request is not linked to your booking.")
	}

	const slotKey = buildSlotKey(
		entry.preferredDate,
		entry.preferredTime,
		entry.preferredStylist,
	)
	if (!slotKey) return emptyQueueInfo(entry.status.toLowerCase(), entry.id, bookingId, slotKey)

	const queue = await prisma.waitlistEntry.findMany({
		where: {
			tenantId: tenant.id,
			status: { in: ACTIVE_QUEUE_STATUSES },
			preferredDate: entry.preferredDate
				? { equals: entry.preferredDate }
				: { equals: null },
			preferredTime: entry.preferredTime,
			preferredStylist: entry.preferredStylist,
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: { id: true },
	})
	const index = queue.findIndex((item) => item.id === entry.id)
	const position = index >= 0 ? index + 1 : null
	return {
		active: position !== null,
		position,
		label: ordinal(position),
		size: queue.length,
		status: entry.status.toLowerCase(),
		slotKey,
		waitlistId: entry.id,
		bookingId,
		source: "live-waitlist-calc",
	}
}
