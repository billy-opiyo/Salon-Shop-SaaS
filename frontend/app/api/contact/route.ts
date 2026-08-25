import { NextResponse } from "next/server"

import { auth } from "@/auth"
import {
	ContactRequestError,
	createPublicContactMessage,
} from "@backend/services/contactService"
import { contactRequestSchema } from "@shared/validation/contact"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<NextResponse> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		)
	}
	const parsed = contactRequestSchema.safeParse(body)
	if (!parsed.success)
		return NextResponse.json(
			{ error: "Please complete the contact details correctly." },
			{ status: 400 },
		)
	try {
		const session = await auth()
		const result = await createPublicContactMessage(
			parsed.data,
			request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
			session?.user?.id,
		)
		return NextResponse.json(
			{ messageId: result.id, status: result.status },
			{ status: 201 },
		)
	} catch (error) {
		if (error instanceof ContactRequestError)
			return NextResponse.json(
				{ error: error.message },
				{ status: error.message.startsWith("Security") ? 403 : 400 },
			)
		return NextResponse.json(
			{ error: "The contact message could not be sent." },
			{ status: 500 },
		)
	}
}
