import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
	loginActivity: { createMany: vi.fn(), findMany: vi.fn() },
	securityAlert: { createMany: vi.fn() },
	user: { findUnique: vi.fn(), updateMany: vi.fn() },
}))

vi.mock("../../backend/db/prisma", () => ({ prisma: prismaMock }))

import { recordLoginActivity } from "../../backend/services/loginActivityService"

const now = new Date("2026-10-15T12:00:00.000Z")

describe("login activity security parity", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		prismaMock.user.findUnique.mockResolvedValue({
			id: "user-a",
			blockedUntil: null,
			memberships: [{ tenantId: "tenant-a" }, { tenantId: "tenant-b" }],
		})
		prismaMock.loginActivity.createMany.mockResolvedValue({ count: 2 })
		prismaMock.securityAlert.createMany.mockResolvedValue({ count: 2 })
		prismaMock.user.updateMany.mockResolvedValue({ count: 1 })
	})

	it("locks after five unique failures in fifteen minutes and alerts each tenant", async () => {
		prismaMock.loginActivity.findMany.mockResolvedValue([
			{ createdAt: new Date(now.getTime() - 60_000) },
			{ createdAt: new Date(now.getTime() - 60_000) },
			{ createdAt: new Date(now.getTime() - 2 * 60_000) },
			{ createdAt: new Date(now.getTime() - 3 * 60_000) },
			{ createdAt: new Date(now.getTime() - 4 * 60_000) },
		])

		await recordLoginActivity({
			userId: "user-a",
			email: "person@example.com",
			provider: "credentials",
			status: "failure",
			failureCode: "invalid_credentials",
			userAgent: "Test Browser",
			ipAddress: "203.0.113.5",
			country: "KE",
			now,
		})

		expect(prismaMock.loginActivity.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					tenantId: "tenant-a",
					failureCode: "invalid_credentials",
					riskLevel: "high",
					country: "KE",
				}),
			]),
		})
		expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
			where: expect.objectContaining({ id: "user-a" }),
			data: { blockedUntil: new Date(now.getTime() + 30 * 60_000) },
		})
		expect(prismaMock.securityAlert.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({
					tenantId: "tenant-a",
					alertType: "multiple_failed_login_attempts",
				}),
				expect.objectContaining({
					tenantId: "tenant-b",
					alertType: "multiple_failed_login_attempts",
				}),
			]),
		})
	})

	it("flags repeated failures without locking before the fifth attempt", async () => {
		prismaMock.loginActivity.findMany.mockResolvedValue([
			{ createdAt: new Date(now.getTime() - 60_000) },
			{ createdAt: new Date(now.getTime() - 2 * 60_000) },
		])

		await recordLoginActivity({
			userId: "user-a",
			email: "person@example.com",
			provider: "credentials",
			status: "failure",
			now,
		})

		expect(prismaMock.loginActivity.createMany).toHaveBeenCalledWith({
			data: expect.arrayContaining([
				expect.objectContaining({ riskLevel: "medium", riskScore: 65 }),
			]),
		})
		expect(prismaMock.user.updateMany).not.toHaveBeenCalled()
		expect(prismaMock.securityAlert.createMany).not.toHaveBeenCalled()
	})
})
