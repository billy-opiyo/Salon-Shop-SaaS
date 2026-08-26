import { NextRequest, NextResponse } from "next/server"

import {
	AuthTokenError,
	createPasswordResetToken,
	resetPassword,
} from "@backend/services/authTokenService"

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as {
			action?: unknown
			email?: unknown
			token?: unknown
			newPassword?: unknown
		}
		if (body.action === "request") {
			if (typeof body.email !== "string") {
				return NextResponse.json(
					{ error: "Email is required." },
					{ status: 400 },
				)
			}
			const result = await createPasswordResetToken(body.email)
			return NextResponse.json({ ok: true, ...result })
		}
		if (
			body.action === "reset" &&
			typeof body.token === "string" &&
			typeof body.newPassword === "string"
		) {
			await resetPassword(body.token, body.newPassword)
			return NextResponse.json({ ok: true })
		}
		return NextResponse.json(
			{ error: "Invalid password reset request." },
			{ status: 400 },
		)
	} catch (error) {
		if (error instanceof AuthTokenError) {
			return NextResponse.json({ error: error.message }, { status: 400 })
		}
		return NextResponse.json(
			{ error: "Password reset failed." },
			{ status: 500 },
		)
	}
}
