import "server-only"

import { ReviewStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	consumeRateLimit,
	hashRateLimitSubject,
} from "@backend/services/rateLimit"
import { verifyTurnstileToken } from "@backend/services/turnstile"
import type {
	ReviewEditInput,
	ReviewReportInput,
	ReviewRequestInput,
} from "@shared/validation/review"

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

export async function editClientReview(
	userId: string,
	input: ReviewEditInput,
): Promise<void> {
	const review = await prisma.review.findFirst({
		where: {
			id: input.id,
			userId,
			tenant: { slug: input.tenantSlug.toLowerCase(), status: "ACTIVE" },
		},
		select: { id: true },
	})
	if (!review) throw new ReviewRequestError("Review not found.")
	await prisma.review.update({
		where: { id: review.id },
		data: {
			rating: input.rating,
			serviceName: input.serviceName,
			text: input.text,
			status: ReviewStatus.PENDING,
			editedAt: new Date(),
		},
	})
}

export async function reportClientReview(
	userId: string,
	input: ReviewReportInput,
	remoteAddress?: string,
): Promise<void> {
	if (!(await verifyTurnstileToken(input.turnstileToken, remoteAddress)))
		throw new ReviewRequestError(
			"Security verification failed. Please try again.",
		)
	const tenant = await prisma.tenant.findUnique({
		where: { slug: input.tenantSlug.toLowerCase() },
		select: { id: true, status: true },
	})
	if (!tenant || tenant.status !== "ACTIVE")
		throw new ReviewRequestError("This salon is not currently available.")
	const review = await prisma.review.findFirst({
		where: { id: input.id, tenantId: tenant.id, status: ReviewStatus.APPROVED },
		select: { id: true },
	})
	if (!review) throw new ReviewRequestError("Review not found.")
	await consumeRateLimit({
		tenantId: tenant.id,
		subjectKey: hashRateLimitSubject(`${userId}:${input.id}`),
		kind: "review-report",
		intervalMs: 86_400_000,
	})
	await prisma.review.update({
		where: { id: review.id },
		data: { reportsCount: { increment: 1 } },
	})
}
