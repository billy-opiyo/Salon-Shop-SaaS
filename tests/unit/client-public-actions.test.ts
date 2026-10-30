import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const transactionMock = vi.hoisted(() => ({
	review: { create: vi.fn() },
	activityTimeline: { create: vi.fn() },
}))

const prismaMock = vi.hoisted(() => ({
	tenant: { findUnique: vi.fn() },
	user: { findUnique: vi.fn() },
	review: { findFirst: vi.fn(), update: vi.fn() },
	galleryStyle: { findFirst: vi.fn() },
	favorite: { upsert: vi.fn(), deleteMany: vi.fn() },
	$transaction: vi.fn(),
}))

vi.mock("../../backend/db/prisma", () => ({ prisma: prismaMock }))
vi.mock("../../backend/services/turnstile", () => ({
	verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}))
vi.mock("../../backend/services/rateLimit", () => ({
	consumeRateLimit: vi.fn(),
	hashRateLimitSubject: vi.fn(() => "client-action-subject"),
}))
vi.mock("../../backend/services/mediaService", () => ({
	uploadReviewPhoto: vi.fn(),
}))

import { createClientReview } from "../../backend/services/reviewService"
import { saveFavoriteForClient } from "../../backend/services/favoriteService"

describe("Royal Braids client public actions", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		prismaMock.tenant.findUnique.mockResolvedValue({
			id: "tenant-a",
			status: "DRAFT",
		})
		prismaMock.$transaction.mockImplementation(
			async (callback: (transaction: typeof transactionMock) => unknown) =>
				callback(transactionMock),
		)
	})

	it("saves a published gallery style for the signed-in client", async () => {
		prismaMock.galleryStyle.findFirst.mockResolvedValue({ id: "style-a" })
		prismaMock.favorite.upsert.mockResolvedValue({ id: "favorite-a" })

		await expect(
			saveFavoriteForClient("client-a", "royal-braids", "style-a"),
		).resolves.toEqual({ id: "favorite-a" })
		expect(prismaMock.favorite.upsert).toHaveBeenCalledWith({
			where: {
				tenantId_userId_galleryStyleId: {
					tenantId: "tenant-a",
					userId: "client-a",
					galleryStyleId: "style-a",
				},
			},
			create: {
				tenantId: "tenant-a",
				userId: "client-a",
				galleryStyleId: "style-a",
			},
			update: {},
			select: { id: true },
		})
	})

	it("stores an authenticated review as pending for the draft staging salon", async () => {
		prismaMock.user.findUnique.mockResolvedValue({
			name: "Jane Doe",
			email: "jane@example.com",
			emailVerified: true,
		})
		transactionMock.review.create.mockResolvedValue({
			id: "review-a",
			status: "PENDING",
		})

		await expect(
			createClientReview("client-a", {
				tenantSlug: "royal-braids",
				name: "Jane Doe",
				rating: 5,
				serviceName: "Knotless Braids",
				text: "The service was excellent and I loved the final style.",
				turnstileToken: "test-token",
			}),
		).resolves.toEqual({ id: "review-a", status: "pending" })
		expect(transactionMock.review.create).toHaveBeenCalledWith({
			data: {
				tenantId: "tenant-a",
				userId: "client-a",
				name: "Jane Doe",
				rating: 5,
				serviceName: "Knotless Braids",
				text: "The service was excellent and I loved the final style.",
				photoUrl: undefined,
				status: "PENDING",
			},
			select: { id: true, status: true },
		})
		expect(transactionMock.activityTimeline.create).toHaveBeenCalled()
	})
})
