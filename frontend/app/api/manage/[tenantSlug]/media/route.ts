import { auth } from "@/auth"
import { NextRequest, NextResponse } from "next/server"

import {
	createPresignedMediaUpload,
	finalizeTenantMedia,
	MediaUploadError,
} from "@backend/services/mediaService"

type RouteProps = { params: Promise<{ tenantSlug: string }> }

function isClientMediaError(error: unknown): error is Error {
	return (
		error instanceof MediaUploadError ||
		(error instanceof Error &&
			(error.name === "AuthorizationError" || error.name === "ZodError"))
	)
}

export async function POST(request: NextRequest, props: RouteProps) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null
	if (
		typeof body?.fileName !== "string" ||
		typeof body.mimeType !== "string" ||
		typeof body.byteSize !== "number" ||
		typeof body.kind !== "string"
	)
		return NextResponse.json(
			{ error: "fileName, mimeType, byteSize, and kind are required." },
			{ status: 400 },
		)
	try {
		return NextResponse.json(
			await createPresignedMediaUpload({
				userId: session.user.id,
				tenantSlug,
				fileName: body.fileName,
				mimeType: body.mimeType,
				byteSize: body.byteSize,
				kind: body.kind,
			}),
			{ status: 201 },
		)
	} catch (error) {
		if (isClientMediaError(error))
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Media upload signing failed:", error)
		return NextResponse.json(
			{ error: "Media upload could not be prepared." },
			{ status: 500 },
		)
	}
}

export async function PATCH(request: NextRequest, props: RouteProps) {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	const { tenantSlug } = await props.params
	const body = (await request.json().catch(() => null)) as {
		assetId?: unknown
	} | null
	if (typeof body?.assetId !== "string")
		return NextResponse.json({ error: "assetId is required." }, { status: 400 })
	try {
		return NextResponse.json(
			await finalizeTenantMedia(session.user.id, tenantSlug, body.assetId),
		)
	} catch (error) {
		if (isClientMediaError(error))
			return NextResponse.json({ error: error.message }, { status: 400 })
		console.error("Media upload finalization failed:", error)
		return NextResponse.json(
			{ error: "Media upload could not be finalized." },
			{ status: 500 },
		)
	}
}
