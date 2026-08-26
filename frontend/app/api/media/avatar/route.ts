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
		const formData = await request.formData()
		const file = formData.get("file")
		if (!(file instanceof File) || file.size === 0) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 })
		}

		const buffer = Buffer.from(await file.arrayBuffer())
		const result = await uploadUserAvatar(session.user.id, buffer, file.type)

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
