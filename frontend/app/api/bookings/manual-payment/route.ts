import { NextResponse } from "next/server"
import { z } from "zod"

import {
	ManualBookingReceiptError,
	submitManualBookingPaymentReceipt,
} from "@backend/services/bookingPaymentService"

export const dynamic = "force-dynamic"

const receiptSchema = z.object({
	tenantSlug: z.string().trim().min(3).max(48),
	paymentId: z.string().cuid(),
	phone: z.string().trim().min(7).max(24),
	receiptNumber: z.string().trim().min(6).max(16),
})

function getRemoteAddress(request: Request): string {
	return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
		|| request.headers.get("x-real-ip")
		|| "unknown"
}

export async function POST(request: Request): Promise<NextResponse> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
	}
	const parsed = receiptSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json({ error: "Enter the booking phone number and M-Pesa receipt code." }, { status: 400 })
	try {
		const result = await submitManualBookingPaymentReceipt({
			tenantSlug: parsed.data.tenantSlug,
			paymentId: parsed.data.paymentId,
			phoneInput: parsed.data.phone,
			receiptInput: parsed.data.receiptNumber,
			remoteAddress: getRemoteAddress(request),
		})
		return NextResponse.json(result, { status: 202 })
	} catch (error) {
		if (error instanceof ManualBookingReceiptError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		if (error instanceof Error && error.name === "RateLimitExceededError")
			return NextResponse.json({ error: "Please wait a few seconds before submitting again." }, { status: 429 })
		return NextResponse.json({ error: "The payment receipt could not be submitted." }, { status: 500 })
	}
}
