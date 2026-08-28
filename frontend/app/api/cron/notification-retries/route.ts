import { NextRequest, NextResponse } from "next/server"

import { retryDueNotifications } from "@backend/services/notificationService"

export async function POST(request: NextRequest) {
	const secret = process.env.CRON_SECRET?.trim()
	if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	return NextResponse.json({ retried: await retryDueNotifications() })
}
