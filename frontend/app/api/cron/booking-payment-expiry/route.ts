import { NextRequest, NextResponse } from "next/server"

import { expirePendingBookingPayments } from "@backend/services/bookingPaymentService"

export async function GET(request: NextRequest) {
	const secret = (process.env.CRON_SECRET ?? "").trim()
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

	try {
		return NextResponse.json({
			ok: true,
			...(await expirePendingBookingPayments()),
		})
	} catch (error) {
		console.error("Booking payment expiry sweep failed", error)
		return NextResponse.json(
			{ ok: false, error: "Booking payment expiry sweep failed." },
			{ status: 500 },
		)
	}
}
