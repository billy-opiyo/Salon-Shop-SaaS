import { auth } from "@/auth"
import {
	uploadUserAvatar,
	MediaUploadError,
	MediaProviderConfigurationError,
} from "@backend/services/mediaService"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

	try {
		const tenantSlug = request.headers
			.get("x-tenant-slug")
			?.trim()
			.toLowerCase()
		if (!tenantSlug)
			return NextResponse.json(
				{ error: "A salon tenant is required." },
				{ status: 400 },
			)
		const { prisma } = await import("@backend/db/prisma")
		const tenant = await prisma.tenant.findUnique({
			where: { slug: tenantSlug },
			select: { id: true },
		})
		if (!tenant)
			return NextResponse.json({ error: "Store not found." }, { status: 404 })
		const formData = await request.formData()
		const file = formData.get("file")
		if (!(file instanceof File) || file.size === 0) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 })
		}
		if (file.size > 500 * 1024)
			return NextResponse.json(
				{ error: "Image too large. Maximum 500 KB." },
				{ status: 400 },
			)

		const buffer = Buffer.from(await file.arrayBuffer())
		const result = await uploadUserAvatar(
			session.user.id,
			tenant.id,
			buffer,
			file.type,
		)

		return NextResponse.json(result, { status: 201 })
	} catch (error) {
		if (error instanceof MediaProviderConfigurationError) {
			return NextResponse.json({ error: error.message }, { status: 503 })
		}
		if (error instanceof MediaUploadError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		console.error("Avatar upload failed:", error)
		return NextResponse.json({ error: "Upload failed" }, { status: 500 })
	}
}
