import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const transactionMock = vi.hoisted(() => ({
	contactMessage: { create: vi.fn() },
	activityTimeline: { create: vi.fn() },
}))

const prismaMock = vi.hoisted(() => ({
	tenant: { findUnique: vi.fn() },
	membership: { findFirst: vi.fn() },
	$transaction: vi.fn(),
}))

vi.mock("../../backend/db/prisma", () => ({ prisma: prismaMock }))
vi.mock("../../backend/services/turnstile", () => ({
	verifyTurnstileToken: vi.fn().mockResolvedValue(true),
}))
vi.mock("../../backend/services/rateLimit", () => ({
	consumeRateLimit: vi.fn(),
	hashRateLimitSubject: vi.fn(() => "contact-subject"),
}))
vi.mock("../../backend/services/notificationService", () => ({
	dispatchNotification: vi.fn().mockResolvedValue({ id: "delivery-a", status: "SENT" }),
}))

import { createPublicContactMessage } from "../../backend/services/contactService"

describe("public contact message delivery", () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv("VERCEL_ENV", "test")
		prismaMock.$transaction.mockImplementation(
			async (callback: (transaction: typeof transactionMock) => unknown) =>
				callback(transactionMock),
		)
		prismaMock.tenant.findUnique.mockResolvedValue({
			id: "tenant-a",
			status: "DRAFT",
			businessName: "Royal Braids",
			settings: {
				emailPrimary: "info@royalbraids.ke",
				emailBookings: "bookings@royalbraids.ke",
			},
		})
		transactionMock.contactMessage.create.mockResolvedValue({
			id: "message-a",
			status: "NEW",
		})
	})

	it("stores the message and dispatches an alert to the salon bookings email", async () => {
		const result = await createPublicContactMessage(
			{
				tenantSlug: "royal-braids",
				name: "Jane Doe",
				email: "JANE@example.com",
				subject: "Appointment question",
				message: "Please tell me your next available appointment.",
				turnstileToken: "test-token",
			},
			"203.0.113.5",
			"client-a",
		)

		expect(result).toEqual({ id: "message-a", status: "new" })
		expect(transactionMock.contactMessage.create).toHaveBeenCalledWith({
			data: {
				tenantId: "tenant-a",
				userId: "client-a",
				name: "Jane Doe",
				email: "jane@example.com",
				subject: "Appointment question",
				message: "Please tell me your next available appointment.",
			},
			select: { id: true, status: true },
		})
		expect(transactionMock.activityTimeline.create).toHaveBeenCalled()
		const { dispatchNotification } = await import("../../backend/services/notificationService")
		expect(dispatchNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: "tenant-a",
				channel: "EMAIL",
				templateKey: "contact.alert",
				destination: "bookings@royalbraids.ke",
				idempotencyKeySuffix: "message-a",
				subject: expect.objectContaining({ contactMessageId: "message-a" }),
			}),
		)
		expect(dispatchNotification).not.toHaveBeenCalledWith(
			expect.objectContaining({ userId: "client-a" }),
		)
	})

	it("routes preview DRAFT contact alerts to the salon owner for Resend sandbox delivery", async () => {
		vi.stubEnv("VERCEL_ENV", "preview")
		prismaMock.membership.findFirst.mockResolvedValue({
			user: { email: "babsohaleem01@gmail.com" },
		})

		await createPublicContactMessage({
			tenantSlug: "royal-braids",
			name: "Jane Doe",
			email: "jane@example.com",
			subject: "Appointment question",
			message: "Please tell me your next available appointment.",
			turnstileToken: "test-token",
		})

		const { dispatchNotification } = await import("../../backend/services/notificationService")
		expect(prismaMock.membership.findFirst).toHaveBeenCalledWith({
			where: { tenantId: "tenant-a", role: "OWNER", status: "ACTIVE" },
			select: { user: { select: { email: true } } },
		})
		expect(dispatchNotification).toHaveBeenCalledWith(
			expect.objectContaining({
				templateKey: "contact.alert",
				destination: "babsohaleem01@gmail.com",
			}),
		)
	})
})
