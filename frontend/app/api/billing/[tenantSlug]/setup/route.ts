import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import { requestSetupPayment } from "@backend/services/darajaPaymentService"

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const body = (await request.json().catch(() => null)) as {
		phoneNumber?: unknown
	} | null
	if (typeof body?.phoneNumber !== "string")
		return NextResponse.json(
			{ error: "A billing phone number is required." },
			{ status: 400 },
		)
	try {
		return NextResponse.json(
			await requestSetupPayment(session.user.id, tenantSlug, body.phoneNumber),
		)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Payment could not be started."
		return NextResponse.json({ error: message }, { status: 400 })
	}
}
