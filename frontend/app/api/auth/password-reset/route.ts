import { NextRequest, NextResponse } from "next/server"

import {
	AuthTokenError,
	createPasswordResetToken,
	resetPassword,
} from "@backend/services/authTokenService"
import {
	platformBaseUrl,
	sendPlatformEmail,
} from "@backend/services/notificationService"
import {
	consumeRateLimit,
	hashRateLimitSubject,
} from "@backend/services/rateLimit"

const GENERIC_REQUEST_MESSAGE =
	"If an account exists for that email, a password reset link has been sent."

export async function POST(request: NextRequest) {
	try {
		const body = (await request.json()) as {
			action?: unknown
			email?: unknown
			token?: unknown
			newPassword?: unknown
		}
		if (body.action === "request") {
			if (typeof body.email !== "string" || !body.email.trim()) {
				return NextResponse.json(
					{ error: "Email is required." },
					{ status: 400 },
				)
			}
			const normalizedEmail = body.email.trim().toLowerCase()
			let emailed = false
			try {
				await consumeRateLimit({
					subjectKey: hashRateLimitSubject(normalizedEmail),
					kind: "password-reset-request",
					intervalMs: 15 * 60 * 1000,
				})
				const { token } = await createPasswordResetToken(normalizedEmail)
				// Legacy parity: the reset link is delivered by email.
				const sent = await sendPlatformEmail({
					templateKey: "reset.password",
					destination: normalizedEmail,
					subject: {
						businessName: "Beauty Sphia",
						email: normalizedEmail,
						link: `${platformBaseUrl()}/reset-password?token=${token}`,
					},
				})
				emailed = sent.ok
			} catch {
				// Unknown accounts respond identically so existence never leaks.
			}
			return NextResponse.json({
				ok: true,
				message: GENERIC_REQUEST_MESSAGE,
				emailed,
			})
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
