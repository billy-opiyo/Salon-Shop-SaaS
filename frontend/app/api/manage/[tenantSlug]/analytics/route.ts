import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	getTenantAnalytics,
	getBookingAnalytics,
	getReviewAnalytics,
} from "@backend/services/analyticsService"

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const { tenantSlug } = await props.params
	const { searchParams } = new URL(request.url)
	const reportType = searchParams.get("type") ?? "overview"

	try {
		const tenant = await (
			await import("@backend/db/prisma")
		).prisma.tenant.findUnique({
			where: { slug: tenantSlug.trim().toLowerCase() },
			select: { id: true },
		})
		if (!tenant) {
			return NextResponse.json({ error: "Store not found" }, { status: 404 })
		}

		if (reportType === "bookings") {
			const data = await getBookingAnalytics(tenant.id)
			return NextResponse.json(data)
		}

		if (reportType === "reviews") {
			const data = await getReviewAnalytics(tenant.id)
			return NextResponse.json(data)
		}

		const data = await getTenantAnalytics(tenant.id)
		return NextResponse.json(data)
	} catch (error) {
		console.error("Analytics fetch failed:", error)
		return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
	}
}
