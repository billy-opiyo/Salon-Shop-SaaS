import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	createClientReview,
	editClientReview,
	reportClientReview,
	ReviewRequestError,
} from "@backend/services/reviewService"
import {
	reviewEditSchema,
	reviewReportSchema,
	reviewRequestSchema,
} from "@shared/validation/review"
import { getImageUploadError, MAX_IMAGE_UPLOAD_BYTES } from "@shared/validation/media"
import {
	MediaProviderConfigurationError,
	MediaUploadError,
} from "@backend/services/mediaService"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	let body: unknown
	let photoFile: { readonly file: Buffer; readonly mimeType: string; readonly fileName: string } | undefined
	try {
		if (request.headers.get("content-type")?.includes("multipart/form-data")) {
			const formData = await request.formData()
			body = Object.fromEntries(
				[...formData.entries()].filter(
					(entry): entry is [string, string] => typeof entry[1] === "string",
				),
			)
			const file = formData.get("reviewPhoto")
			if (file instanceof File && file.size > 0) {
				if (file.size > MAX_IMAGE_UPLOAD_BYTES)
					return NextResponse.json({ error: "The review photo must be 1 MB or smaller." }, { status: 413 })
				const imageError = getImageUploadError(file.size, file.type)
				if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })
				photoFile = {
					file: Buffer.from(await file.arrayBuffer()),
					mimeType: file.type,
					fileName: file.name,
				}
			}
		} else {
			body = await request.json()
		}
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	const parsed = reviewRequestSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "Please complete the review details correctly." },
			{ status: 400 },
		)
	try {
		const result = await createClientReview(
			session.user.id,
			parsed.data,
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
			photoFile,
		)
		return NextResponse.json(
			{ reviewId: result.id, status: result.status },
			{ status: 201 },
		)
	} catch (error) {
		if (error instanceof ReviewRequestError)
			return NextResponse.json(
				{ error: error.message },
				{ status: error.message.startsWith("Security") ? 403 : 400 },
			)
		if (error instanceof MediaProviderConfigurationError)
			return NextResponse.json({ error: error.message }, { status: 503 })
		if (error instanceof MediaUploadError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The review could not be submitted." },
			{ status: 500 },
		)
	}
}

export async function PATCH(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	const parsed = reviewEditSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "Please complete the review details correctly." },
			{ status: 400 },
		)
	try {
		await editClientReview(session.user.id, parsed.data)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (error instanceof ReviewRequestError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The review could not be updated." },
			{ status: 500 },
		)
	}
}

export async function PUT(request: Request): Promise<NextResponse> {
	const session = await auth()
	if (!session?.user?.id)
		return NextResponse.json(
			{ error: "Authentication required." },
			{ status: 401 },
		)
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	const parsed = reviewReportSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "A valid report is required." },
			{ status: 400 },
		)
	try {
		await reportClientReview(
			session.user.id,
			parsed.data,
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
		)
		return new NextResponse(null, { status: 204 })
	} catch (error) {
		if (error instanceof ReviewRequestError)
			return NextResponse.json({ error: error.message }, { status: 400 })
		return NextResponse.json(
			{ error: "The review could not be reported." },
			{ status: 500 },
		)
	}
}
