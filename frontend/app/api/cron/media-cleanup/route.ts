import { NextRequest, NextResponse } from "next/server"

import { cleanupExpiredPendingMedia } from "@backend/services/mediaService"

export async function GET(request: NextRequest) {
	const secret = (process.env.CRON_SECRET ?? "").trim()
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
	try {
		const cleaned = await cleanupExpiredPendingMedia()
		return NextResponse.json({ ok: true, cleaned })
	} catch (error) {
		console.error("Media cleanup failed", error)
		return NextResponse.json(
			{ ok: false, error: "Media cleanup failed." },
			{ status: 500 },
		)
	}
}
