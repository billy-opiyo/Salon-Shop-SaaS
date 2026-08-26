import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import { getSecuritySnapshot } from "@backend/services/merchantSecurityService"
import { toSecurityCsv } from "@backend/services/merchantSecurityActionsService"

export async function GET(
	_request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}
	const { tenantSlug } = await props.params
	try {
		const snapshot = await getSecuritySnapshot(session.user.id, tenantSlug)
		return new NextResponse(toSecurityCsv(snapshot), {
			status: 200,
			headers: {
				"content-type": "text/csv; charset=utf-8",
				"content-disposition": `attachment; filename="${tenantSlug}-security.csv"`,
				"cache-control": "no-store",
			},
		})
	} catch (error) {
		if (
			error instanceof Error &&
			(error.name === "MerchantSecurityError" ||
				error.name === "AuthorizationError")
		) {
			return NextResponse.json({ error: error.message }, { status: 403 })
		}
		console.error("Security export failed:", error)
		return NextResponse.json(
			{ error: "Security export failed." },
			{ status: 500 },
		)
	}
}
