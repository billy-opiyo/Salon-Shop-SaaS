import { NextResponse } from "next/server"
import { BookingStatus } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@backend/db/prisma"
import { consumeRateLimit, hashRateLimitSubject } from "@backend/services/rateLimit"
import { BOOKING_TIME_SLOTS } from "@shared/constants/bookingAvailability"

export const dynamic = "force-dynamic"

const querySchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	date: z.string().date(),
	stylistId: z.string().cuid().optional(),
})

function getRemoteAddress(request: Request): string {
	return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
		|| request.headers.get("x-real-ip")
		|| "unknown"
}

export async function GET(request: Request): Promise<NextResponse> {
	const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
	if (!parsed.success) {
		return NextResponse.json({ error: "Choose a valid salon, date, and stylist." }, { status: 400 })
	}

	try {
		const tenant = await prisma.tenant.findUnique({
			where: { slug: parsed.data.tenantSlug.toLowerCase() },
			select: { id: true, status: true },
		})
		if (!tenant || tenant.status !== "ACTIVE") {
			return NextResponse.json({ error: "This salon is not currently accepting bookings." }, { status: 404 })
		}
		if (parsed.data.stylistId) {
			const stylist = await prisma.stylist.findFirst({
				where: { id: parsed.data.stylistId, tenantId: tenant.id, active: true },
				select: { id: true },
			})
			if (!stylist) return NextResponse.json({ error: "That stylist is not available for this salon." }, { status: 400 })
		}

		await consumeRateLimit({
			tenantId: tenant.id,
			subjectKey: hashRateLimitSubject(getRemoteAddress(request)),
			kind: "public-booking-availability",
			intervalMs: 750,
		})

		const slots = await prisma.bookingSlot.findMany({
			where: {
				tenantId: tenant.id,
				date: new Date(`${parsed.data.date}T00:00:00.000Z`),
				OR: [
					{ lockedUntil: { gt: new Date() } },
					{
						booking: {
							is: { status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] } },
						},
					},
				],
			},
			select: {
				slotKey: true,
				timeLabel: true,
				booking: { select: { stylistId: true, stylist: { select: { name: true } } } },
			},
		})
		const selectedStylistId = parsed.data.stylistId
		const bookedSlots = slots
			.filter((slot) => !selectedStylistId || !slot.booking?.stylistId || slot.booking.stylistId === selectedStylistId)
			.map((slot) => ({
				slotId: slot.slotKey,
				timeLabel: slot.timeLabel,
				stylistId: slot.booking?.stylistId ?? null,
				stylistLabel: slot.booking?.stylist?.name ?? "Booked",
			}))

		return NextResponse.json({ timeSlots: BOOKING_TIME_SLOTS, bookedSlots }, {
			headers: { "cache-control": "private, no-store" },
		})
	} catch {
		return NextResponse.json({ error: "Availability could not be loaded. Please try again." }, { status: 503 })
	}
}
