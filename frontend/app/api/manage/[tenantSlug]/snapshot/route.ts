import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	getMerchantAdminSnapshot,
	MerchantAdminSnapshotError,
} from "@backend/services/merchantAdminSnapshotService"

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
		const snapshot = await getMerchantAdminSnapshot(session.user.id, tenantSlug)
		return NextResponse.json(snapshot, {
			headers: { "cache-control": "no-store" },
		})
	} catch (error) {
		if (error instanceof MerchantAdminSnapshotError) {
			return NextResponse.json({ error: error.message }, { status: 403 })
		}
		console.error("Merchant admin snapshot failed:", error)
		return NextResponse.json(
			{ error: "Unable to load admin data." },
			{ status: 500 },
		)
	}
}
