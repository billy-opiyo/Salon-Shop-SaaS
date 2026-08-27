import { NextRequest, NextResponse } from "next/server"

import { handleDarajaCallback } from "@backend/services/darajaPaymentService"

export async function POST(request: NextRequest) {
	await handleDarajaCallback(await request.json())
	return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" })
}
