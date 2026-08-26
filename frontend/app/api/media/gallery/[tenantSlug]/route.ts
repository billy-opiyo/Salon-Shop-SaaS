import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	uploadGalleryImage,
	MediaUploadError,
} from "@backend/services/mediaService"
import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ tenantSlug: string }> },
) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	const { tenantSlug } = await props.params

	try {
		const tenant = await prisma.tenant.findUnique({
			where: { slug: tenantSlug.trim().toLowerCase() },
			select: { id: true },
		})
		if (!tenant) {
			return NextResponse.json({ error: "Store not found" }, { status: 404 })
		}
		const membership = await prisma.membership.findUnique({
			where: {
				tenantId_userId: { tenantId: tenant.id, userId: session.user.id },
			},
			select: {
				tenantId: true,
				userId: true,
				role: true,
				status: true,
				canManageAdmins: true,
				canManageBookings: true,
				canManageContent: true,
				canManageSecurity: true,
			},
		})
		assertTenantPermission(
			assertTenantMembership(membership, tenant.id),
			"canManageContent",
		)

		const formData = await request.formData()
		const file = formData.get("file") as File | null
		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 })
		}

		const buffer = Buffer.from(await file.arrayBuffer())
		const result = await uploadGalleryImage(
			tenant.id,
			buffer,
			file.type,
			file.name,
		)

		return NextResponse.json(result, { status: 201 })
	} catch (error) {
		if (error instanceof MediaUploadError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		console.error("Gallery upload failed:", error)
		return NextResponse.json({ error: "Upload failed" }, { status: 500 })
	}
}
