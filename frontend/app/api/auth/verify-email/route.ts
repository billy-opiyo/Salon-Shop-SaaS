import { NextRequest, NextResponse } from "next/server"

import {
	AuthTokenError,
	verifyEmailAddress,
} from "@backend/services/authTokenService"

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as { token?: unknown }
		if (typeof body.token !== "string" || body.token.trim().length < 32) {
			return NextResponse.json(
				{ error: "A valid token is required." },
				{ status: 400 },
			)
		}
		await verifyEmailAddress(body.token.trim())
		return NextResponse.json({ ok: true })
	} catch (error) {
		if (error instanceof AuthTokenError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json(
			{ error: "Email verification failed." },
			{ status: 500 },
		)
	}
}
