import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { requestRenewalPaymentForUser } from "@backend/services/merchantBillingService"

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
	try {
		return NextResponse.json(
			await requestRenewalPaymentForUser(
				session.user.id,
				tenantSlug,
				typeof body?.phoneNumber === "string" ? body.phoneNumber : undefined,
			),
		)
	} catch (error) {
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Payment could not be started.",
			},
			{ status: 400 },
		)
	}
}
