import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
	booking: { findMany: vi.fn() },
	membership: { findUnique: vi.fn() },
	tenant: { findUnique: vi.fn() },
}))

vi.mock("../../backend/db/prisma", () => ({ prisma: prismaMock }))
vi.mock("../../backend/services/notificationService", () => ({
	notifyBookingCustomer: vi.fn(),
	notifyNextWaitlistedCustomer: vi.fn(),
}))

import { listBookingsForUser } from "../../backend/services/merchantBookingService"

const activeMembership = {
	tenantId: "tenant-a",
	userId: "user-a",
	role: "STAFF" as const,
	status: "ACTIVE" as const,
	canManageAdmins: false,
	canManageBookings: true,
	canManageContent: false,
	canManageSecurity: false,
}

describe("authenticated tenant isolation", () => {
	it("rejects a signed-in user whose membership belongs to another tenant", async () => {
		prismaMock.tenant.findUnique.mockResolvedValue({ id: "tenant-a" })
		prismaMock.membership.findUnique.mockResolvedValue({
			...activeMembership,
			tenantId: "tenant-b",
		})

		await expect(listBookingsForUser("user-a", "tenant-a")).rejects.toThrow(
			"not authorized",
		)
		expect(prismaMock.booking.findMany).not.toHaveBeenCalled()
	})

	it("scopes an authorized signed-in user's booking read to their tenant", async () => {
		prismaMock.tenant.findUnique.mockResolvedValue({ id: "tenant-a" })
		prismaMock.membership.findUnique.mockResolvedValue(activeMembership)
		prismaMock.booking.findMany.mockResolvedValue([])

		await listBookingsForUser("user-a", "tenant-a")

		expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { tenantId: "tenant-a" } }),
		)
	})
})
