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

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
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
