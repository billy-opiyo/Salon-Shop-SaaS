"use server"

import { hash } from "bcryptjs"

import { prisma } from "@backend/db/prisma"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import { createEmailVerificationToken } from "@backend/services/authTokenService"
import {
	platformBaseUrl,
	sendPlatformEmail,
} from "@backend/services/notificationService"
import { signupSchema } from "@shared/validation/auth"

export type SignupResult =
	| { readonly ok: true }
	| { readonly ok: false; readonly message: string }

export async function registerAccount(
	formData: FormData,
): Promise<SignupResult> {
	const parsed = signupSchema.safeParse({
		name: formData.get("name"),
		email: formData.get("email"),
		password: formData.get("password"),
		turnstileToken: formData.get("turnstileToken"),
	})

	if (!parsed.success)
		return { ok: false, message: "Please complete all fields correctly." }
	if (!process.env.TURNSTILE_SECRET_KEY) {
		return {
			ok: false,
			message: "Account creation is awaiting platform security configuration.",
		}
	}
	if (!(await verifyTurnstileToken(parsed.data.turnstileToken))) {
		return {
			ok: false,
			message: "Security verification failed. Please try again.",
		}
	}

	const email = parsed.data.email.toLowerCase()
	const existingUser = await prisma.user.findUnique({ where: { email } })
	if (existingUser)
		return { ok: false, message: "An account with that email already exists." }

	const passwordHash = await hash(parsed.data.password, 12)
	await prisma.user.create({
		data: { name: parsed.data.name, email, passwordHash },
	})

	// Legacy parity: every new account receives an email verification link.
	// Provider outages must never block account creation itself.
	try {
		const { token } = await createEmailVerificationToken(email)
		await sendPlatformEmail({
			templateKey: "verify.address",
			destination: email,
			subject: {
				businessName: "Beauty Sphia",
				firstName: parsed.data.name,
				email,
				link: `${platformBaseUrl()}/verify-email?token=${token}`,
			},
		})
	} catch {
		// Account creation still succeeds even if verification delivery fails.
	}

	return { ok: true }
}
