import { auth } from "@/auth"
import { MerchantBillingError, submitManualTransferForReview } from "@backend/services/merchantBillingService"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Authentication required." }, { status: 401 })
	if (request.headers.get("origin") && request.headers.get("origin") !== request.nextUrl.origin)
		return NextResponse.json({ error: "Invalid request origin." }, { status: 403 })
	const { tenantSlug } = await props.params
	const body = (await request.json().catch(() => null)) as {
		invoiceId?: unknown
		senderPhoneNumber?: unknown
		receiptNumber?: unknown
	} | null
	if (
		typeof body?.invoiceId !== "string" ||
		typeof body.senderPhoneNumber !== "string" ||
		typeof body.receiptNumber !== "string"
	)
		return NextResponse.json({ error: "Enter the transfer phone number and receipt reference." }, { status: 400 })
	try {
		return NextResponse.json(await submitManualTransferForReview(
			session.user.id,
			tenantSlug,
			body.invoiceId,
			body.senderPhoneNumber,
			body.receiptNumber,
		))
	} catch (error) {
		const message = error instanceof MerchantBillingError
			? error.message
			: error instanceof Error ? error.message : "The transfer could not be submitted."
		return NextResponse.json({ error: message }, { status: 400 })
	}
}
