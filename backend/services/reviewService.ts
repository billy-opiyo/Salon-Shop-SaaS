import "server-only"

import { ReviewStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	consumeRateLimit,
	hashRateLimitSubject,
} from "@backend/services/rateLimit"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import type { ReviewRequestInput } from "@shared/validation/review"

export class ReviewRequestError extends Error {
	readonly code = "REVIEW_REQUEST_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "ReviewRequestError"
	}
}

export async function createClientReview(
	userId: string,
	input: ReviewRequestInput,
	remoteAddress?: string,
): Promise<{ readonly id: string; readonly status: string }> {
	if (!(await verifyTurnstileToken(input.turnstileToken, remoteAddress))) {
		throw new ReviewRequestError(
			"Security verification failed. Please try again.",
		)
	}

	const [tenant, user] = await Promise.all([
		prisma.tenant.findUnique({
			where: { slug: input.tenantSlug.toLowerCase() },
			select: { id: true, status: true },
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: { name: true, email: true, emailVerified: true },
		}),
	])
	if (!tenant || tenant.status !== "ACTIVE")
		throw new ReviewRequestError("This salon is not currently available.")
	if (!user || !user.emailVerified)
		throw new ReviewRequestError(
			"Please verify your email before submitting a review.",
		)

	await consumeRateLimit({
		tenantId: tenant.id,
		subjectKey: hashRateLimitSubject(userId),
		kind: "client-review",
		intervalMs: 86_400_000,
	})

	const review = await prisma.review.create({
		data: {
			tenantId: tenant.id,
			userId,
			name: user.name?.trim() || user.email.split("@")[0] || "Client",
			rating: input.rating,
			serviceName: input.serviceName,
			text: input.text,
			status: ReviewStatus.PENDING,
		},
		select: { id: true, status: true },
	})
	return { id: review.id, status: review.status.toLowerCase() }
}
