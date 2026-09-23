import { NextRequest, NextResponse } from "next/server"

import { runBookingSlotExpirySweep } from "@backend/services/bookingSlotLifecycleService"

export async function GET(request: NextRequest): Promise<NextResponse> {
	const secret = (process.env.CRON_SECRET ?? "").trim()
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

	try {
		return NextResponse.json({
			ok: true,
			...(await runBookingSlotExpirySweep()),
		})
	} catch (error) {
		console.error("Booking slot expiry sweep failed", error)
		return NextResponse.json(
			{ ok: false, error: "Booking slot expiry sweep failed." },
			{ status: 500 },
		)
	}
}
