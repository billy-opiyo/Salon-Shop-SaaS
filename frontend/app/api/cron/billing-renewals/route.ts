import { NextRequest, NextResponse } from "next/server"

import { createDueRenewalInvoices } from "@backend/services/recurringBillingService"

export async function GET(request: NextRequest) {
	const secret = (process.env.CRON_SECRET ?? "").trim()
	if (secret && request.headers.get("authorization") !== `Bearer ${secret}`)
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 })

	try {
		const result = await createDueRenewalInvoices()
		return NextResponse.json({ ok: true, ...result })
	} catch (error) {
		console.error("Billing renewal sweep failed", error)
		return NextResponse.json(
			{ ok: false, error: "Billing renewal sweep failed." },
			{ status: 500 },
		)
	}
}
