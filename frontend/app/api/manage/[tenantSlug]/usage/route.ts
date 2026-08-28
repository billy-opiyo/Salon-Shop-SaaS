import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import { getTenantUsage } from "@backend/services/usageService"

export async function GET(
	_request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			memberships: {
				where: { userId: session.user.id, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageContent: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageSecurity: true,
				},
			},
		},
	})
	if (!tenant)
		return NextResponse.json({ error: "Store not found." }, { status: 404 })
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, "canManageContent")
	return NextResponse.json(await getTenantUsage(tenant.id), {
		headers: { "cache-control": "no-store" },
	})
}
