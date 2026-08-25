import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	ClientRescheduleError,
	rescheduleClientBooking,
} from "@backend/services/clientRescheduleService"
import { clientRescheduleSchema } from "@shared/validation/clientBooking"

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
	const parsed = clientRescheduleSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "Please choose a valid appointment date and time." },
			{ status: 400 },
		)
	try {
		await rescheduleClientBooking(
			session.user.id,
			parsed.data.tenantSlug,
			parsed.data,
		)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (error instanceof ClientRescheduleError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The booking could not be rescheduled." },
			{ status: 500 },
		)
	}
}
