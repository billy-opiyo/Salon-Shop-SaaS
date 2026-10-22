import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
	tenant: { findUnique: vi.fn() },
	waitlistEntry: { findFirst: vi.fn(), update: vi.fn() },
}))

const dispatchNotificationMock = vi.hoisted(() => vi.fn())

vi.mock("../../backend/db/prisma", () => ({ prisma: prismaMock }))
vi.mock("../../backend/services/notificationService", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../backend/services/notificationService")>()
	return { ...actual, dispatchNotification: dispatchNotificationMock }
})

import { NotificationStatus, WaitlistStatus } from "@prisma/client"

import { notifyNextWaitlistedCustomer } from "../../backend/services/notificationService"

describe("released-slot waitlist notification", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		prismaMock.tenant.findUnique.mockResolvedValue({ businessName: "Royal Braids" })
		prismaMock.waitlistEntry.findFirst.mockResolvedValue({
			id: "waitlist-a",
			email: "client@example.com",
			phone: "+254700000000",
			serviceName: "Braids",
			preferredDate: new Date("2026-11-02T00:00:00.000Z"),
			preferredTime: "10:00 AM",
		})
		dispatchNotificationMock.mockResolvedValue({ status: NotificationStatus.SENT })
		prismaMock.waitlistEntry.update.mockResolvedValue({})
	})

	it("selects only waiters matching the released date, time and stylist (or any stylist)", async () => {
		const appointmentDate = new Date("2026-11-02T00:00:00.000Z")
		await notifyNextWaitlistedCustomer("tenant-a", {
			appointmentDate,
			timeLabel: "10:00 AM",
			stylistName: "Amina",
		})

		expect(prismaMock.waitlistEntry.findFirst).toHaveBeenCalledWith({
			where: {
				tenantId: "tenant-a",
				status: WaitlistStatus.WAITING,
				preferredDate: appointmentDate,
				preferredTime: "10:00 AM",
				OR: [
					{ preferredStylist: "Amina" },
					{ preferredStylist: null },
					{ preferredStylist: "" },
					{ preferredStylist: "Any Available" },
					{ preferredStylist: "Booked" },
				],
			},
			orderBy: [{ queuePosition: "asc" }, { createdAt: "asc" }],
			select: {
				id: true,
				email: true,
				phone: true,
				serviceName: true,
				preferredDate: true,
				preferredTime: true,
			},
		})
		expect(prismaMock.waitlistEntry.update).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "waitlist-a" } }),
		)
	})
})
