import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	cancelClientBooking,
	ClientBookingError,
} from "@backend/services/clientBookingService"
import { clientBookingActionSchema } from "@shared/validation/clientBooking"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	const parsed = clientBookingActionSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "A valid booking is required." },
			{ status: 400 },
		)
	try {
		await cancelClientBooking(
			session.user.id,
			parsed.data.tenantSlug,
			parsed.data.bookingId,
		)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (error instanceof ClientBookingError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The booking could not be cancelled." },
			{ status: 500 },
		)
	}
}
