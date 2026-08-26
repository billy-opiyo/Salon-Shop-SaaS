import "server-only"

import { randomBytes } from "node:crypto"
import { hash } from "bcryptjs"

import { prisma } from "@backend/db/prisma"

export class AuthTokenError extends Error {
	readonly code = "AUTH_TOKEN_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "AuthTokenError"
	}
}

function createToken(): string {
	return randomBytes(32).toString("hex")
}

async function createTokenForIdentifier(identifier: string): Promise<string> {
	await prisma.verificationToken.deleteMany({ where: { identifier } })
	const token = createToken()
	await prisma.verificationToken.create({
		data: {
			identifier,
			token,
			expires: new Date(Date.now() + 30 * 60 * 1000),
		},
	})
	return token
}

export async function createEmailVerificationToken(
	email: string,
): Promise<{ readonly token: string; readonly expires: Date }> {
	const normalizedEmail = email.trim().toLowerCase()
	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		select: { id: true, emailVerified: true },
	})
	if (!user) throw new AuthTokenError("Account not found.")
	if (user.emailVerified) throw new AuthTokenError("Email is already verified.")
	const token = await createTokenForIdentifier(`verify:${normalizedEmail}`)
	return { token, expires: new Date(Date.now() + 30 * 60 * 1000) }
}

export async function verifyEmailAddress(token: string): Promise<void> {
	const record = await prisma.verificationToken.findFirst({
		where: { token, identifier: { startsWith: "verify:" } },
		select: { identifier: true, expires: true },
	})
	if (!record || record.expires <= new Date()) {
		throw new AuthTokenError("Verification link is invalid or expired.")
	}
	const email = record.identifier.slice("verify:".length)
	await prisma.$transaction(async (transaction) => {
		const user = await transaction.user.findUnique({
			where: { email },
			select: { id: true },
		})
		if (!user) throw new AuthTokenError("Account not found.")
		await transaction.user.update({
			where: { id: user.id },
			data: { emailVerified: new Date() },
		})
		await transaction.verificationToken.deleteMany({
			where: { identifier: record.identifier },
		})
	})
}

export async function createPasswordResetToken(
	email: string,
): Promise<{ readonly token: string; readonly expires: Date }> {
	const normalizedEmail = email.trim().toLowerCase()
	const user = await prisma.user.findUnique({
		where: { email: normalizedEmail },
		select: { id: true },
	})
	if (!user) throw new AuthTokenError("Account not found.")
	const token = await createTokenForIdentifier(`reset:${normalizedEmail}`)
	return { token, expires: new Date(Date.now() + 30 * 60 * 1000) }
}

export async function resetPassword(
	token: string,
	newPassword: string,
): Promise<void> {
	const record = await prisma.verificationToken.findFirst({
		where: { token, identifier: { startsWith: "reset:" } },
		select: { identifier: true, expires: true },
	})
	if (!record || record.expires <= new Date()) {
		throw new AuthTokenError("Password reset link is invalid or expired.")
	}
	if (newPassword.length < 12 || newPassword.length > 128) {
		throw new AuthTokenError("Password must be between 12 and 128 characters.")
	}
	const email = record.identifier.slice("reset:".length)
	const passwordHash = await hash(newPassword, 12)
	await prisma.$transaction(async (transaction) => {
		const user = await transaction.user.findUnique({
			where: { email },
			select: { id: true },
		})
		if (!user) throw new AuthTokenError("Account not found.")
		await transaction.user.update({
			where: { id: user.id },
			data: { passwordHash, passwordResetRequired: false },
		})
		await transaction.session.deleteMany({ where: { userId: user.id } })
		await transaction.verificationToken.deleteMany({
			where: { identifier: record.identifier },
		})
	})
}
