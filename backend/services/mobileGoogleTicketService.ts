import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { prisma } from "@backend/db/prisma"
import {
	isValidMobileGoogleChallenge,
	isValidMobileGoogleState,
	mobileGoogleTicketIdentifierPrefix,
} from "@shared/mobileGoogleAuth"

const TICKET_TTL_MS = 2 * 60 * 1000

export { isValidMobileGoogleChallenge, isValidMobileGoogleState, mobileGoogleTicketIdentifierPrefix }

export type MobileGoogleTicketInput = {
	readonly state: string
	readonly challenge: string
	readonly userId: string
}

export function mobileGoogleChallengeForVerifier(verifier: string): string | null {
	if (!/^[A-Za-z0-9_-]{43}$/.test(verifier)) return null
	return createHash("sha256").update(verifier).digest("base64url")
}

export async function issueMobileGoogleTicket(input: MobileGoogleTicketInput): Promise<string> {
	if (!isValidMobileGoogleState(input.state) || !isValidMobileGoogleChallenge(input.challenge) || !input.userId) {
		throw new Error("Invalid Beauty Sphia mobile sign-in details.")
	}
	const now = new Date()
	const identifierPrefix = mobileGoogleTicketIdentifierPrefix(input.state, input.challenge)
	await prisma.verificationToken.deleteMany({
		where: { identifier: { startsWith: identifierPrefix }, expires: { lt: now } },
	})
	const ticket = randomBytes(32).toString("base64url")
	await prisma.verificationToken.create({
		data: {
			identifier: `${identifierPrefix}${input.userId}`,
			token: createHash("sha256").update(ticket).digest("hex"),
			expires: new Date(now.getTime() + TICKET_TTL_MS),
		},
	})
	return ticket
}

export async function consumeMobileGoogleTicket(input: {
	readonly ticket: string
	readonly state: string
	readonly verifier: string
}) {
	if (!/^[A-Za-z0-9_-]{40,60}$/.test(input.ticket) || !isValidMobileGoogleState(input.state)) return null
	const challenge = mobileGoogleChallengeForVerifier(input.verifier)
	if (!challenge) return null
	const identifierPrefix = mobileGoogleTicketIdentifierPrefix(input.state, challenge)
	const token = createHash("sha256").update(input.ticket).digest("hex")
	const now = new Date()
	const record = await prisma.verificationToken.findFirst({
		where: { identifier: { startsWith: identifierPrefix }, token, expires: { gt: now } },
		select: { identifier: true, token: true },
	})
	if (!record) return null
	const userId = record.identifier.slice(identifierPrefix.length)
	if (!userId) return null
	const consumed = await prisma.verificationToken.deleteMany({
		where: { identifier: record.identifier, token: record.token, expires: { gt: now } },
	})
	if (consumed.count !== 1) return null
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, email: true, image: true, blockedUntil: true },
	})
	if (!user || (user.blockedUntil && user.blockedUntil > now)) return null
	return { id: user.id, name: user.name, email: user.email, image: user.image }
}
