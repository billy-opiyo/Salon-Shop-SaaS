import { NextRequest, NextResponse } from "next/server"

import { handleDarajaCallback } from "@backend/services/darajaPaymentService"
import { handleBookingDarajaCallback } from "@backend/services/bookingPaymentService"

export async function POST(request: NextRequest) {
	const payload = await request.json()
	// Both ledgers share Safaricom's callback URL, but are resolved by their
	// separate checkout records before either business workflow is applied.
	await handleBookingDarajaCallback(payload)
	await handleDarajaCallback(payload)
	return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
}
