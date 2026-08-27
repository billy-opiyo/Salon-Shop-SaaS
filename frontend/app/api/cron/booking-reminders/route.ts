import { NextRequest, NextResponse } from "next/server"

import { runBookingReminderSweep } from "@backend/services/reminderService"

/**
 * Scheduled endpoint mirroring the legacy 15-minute WhatsApp reminder job.
 * Protect the run in production by setting CRON_SECRET and having the
 * scheduler send `Authorization: Bearer <CRON_SECRET>` (Vercel Cron does).
 */
export async function GET(request: NextRequest) {
	const secret = (process.env.CRON_SECRET ?? "").trim()
	if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
	}

	try {
		const result = await runBookingReminderSweep()
		return NextResponse.json({ ok: true, ...result })
	} catch (error) {
		console.error("Booking reminder sweep failed", error)
		return NextResponse.json(
			{ ok: false, error: "Booking reminder sweep failed." },
			{ status: 500 },
		)
	}
}