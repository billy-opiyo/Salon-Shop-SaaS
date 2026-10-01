import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	getPlatformStorefrontDesign,
	PlatformAdminActionError,
	uploadPlatformStorefrontImage,
	updatePlatformStorefrontDesign,
} from "@backend/services/platformAdminService"
import {
	assertPlatformAdmin,
	PlatformAuthorizationError,
} from "@backend/services/platformAuthorization"

async function requirePlatformAdmin() {
	const session = await auth()
	if (!session?.user?.id) throw new PlatformAdminActionError("Authentication required.")
	try {
		assertPlatformAdmin(session.user.id, session.user.email)
	} catch (error) {
		if (error instanceof PlatformAuthorizationError)
			throw new PlatformAdminActionError(error.message)
		throw error
	}
	return session
}

export async function GET() {
	try {
		await requirePlatformAdmin()
		return NextResponse.json(await getPlatformStorefrontDesign())
	} catch (error) {
		if (error instanceof PlatformAdminActionError)
			return NextResponse.json({ error: error.message }, { status: 403 })
		console.error("Platform storefront design read failed:", error)
		return NextResponse.json({ error: "Platform storefront design could not be loaded." }, { status: 500 })
	}
}

export async function POST(request: NextRequest) {
	try {
		const session = await requirePlatformAdmin()
		const formData = await request.formData()
		const file = formData.get("file")
		const kind = formData.get("kind")
		if (!(file instanceof File) || file.size === 0)
			return NextResponse.json({ error: "No image file provided." }, { status: 400 })
		if (kind !== "LOGO" && kind !== "HERO_DESKTOP" && kind !== "HERO_MOBILE")
			return NextResponse.json({ error: "A valid platform image kind is required." }, { status: 400 })
		const url = await uploadPlatformStorefrontImage(
			session.user.id,
			Buffer.from(await file.arrayBuffer()),
			file.type,
			file.name,
			kind,
		)
		return NextResponse.json({ url }, { status: 201 })
	} catch (error) {
		if (error instanceof PlatformAdminActionError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Platform storefront image upload failed:", error)
		return NextResponse.json({ error: "Platform storefront image upload failed." }, { status: 500 })
	}
}

export async function PUT(request: NextRequest) {
	try {
		const session = await requirePlatformAdmin()
		const body = await request.json()
		const design = await updatePlatformStorefrontDesign(session.user.id, body)
		return NextResponse.json(design)
	} catch (error) {
		if (error instanceof PlatformAdminActionError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		if (error instanceof Error && error.name === "ZodError")
			return NextResponse.json({ error: "Please check the platform design fields and try again." }, { status: 400 })
		console.error("Platform storefront design update failed:", error)
		return NextResponse.json({ error: "Platform storefront design could not be saved." }, { status: 500 })
	}
}
