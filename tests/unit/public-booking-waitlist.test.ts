import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const transactionMock = vi.hoisted(() => ({
	booking: { create: vi.fn() },
	bookingSlot: { create: vi.fn(), findMany: vi.fn() },
	waitlistEntry: { findFirst: vi.fn(), updateMany: vi.fn() },
	stylist: { findFirst: vi.fn() },
	bookingPayment: { create: vi.fn() },
	notificationDelivery: { create: vi.fn() },
}))

const prismaMock = vi.hoisted(() => ({
	tenant: { findUnique: vi.fn() },
	$transaction: vi.fn(),
}))

vi.mock("../../backend/db/prisma", () => ({ prisma: prismaMock }))
vi.mock("../../backend/services/turnstile", () => ({ verifyTurnstileToken: vi.fn().mockResolvedValue(true) }))
vi.mock("../../backend/services/rateLimit", () => ({ consumeRateLimit: vi.fn(), hashRateLimitSubject: vi.fn(() => "subject") }))
vi.mock("../../backend/services/notificationService", () => ({ dispatchNotification: vi.fn() }))

import { BookingStatus } from "@prisma/client"

import { createPublicBooking } from "../../backend/services/bookingService"

const input = {
	tenantSlug: "royal-braids",
	firstName: "Amina",
	lastName: "Client",
	email: "amina@example.com",
	phone: "+254700000000",
	serviceId: "service-a",
	serviceName: "Knotless Braids",
	appointmentDate: "2099-10-10",
	timeLabel: "10:00 AM",
	waitlistId: "waitlist-a",
	turnstileToken: "test-token",
}

describe("public booking waitlist conversion", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		prismaMock.$transaction.mockImplementation(async (callback: (transaction: typeof transactionMock) => unknown) => callback(transactionMock))
		prismaMock.tenant.findUnique.mockResolvedValue({
			id: "tenant-a",
			status: "ACTIVE",
			businessName: "Royal Braids",
			currency: "KES",
			settings: null,
			services: [{ id: "service-a", name: "Knotless Braids", orderOnly: false, priceMinor: null }],
			stylists: [],
		})
		transactionMock.waitlistEntry.findFirst.mockResolvedValue({
			status: "WAITING",
			email: "amina@example.com",
			phone: "+254700000000",
			serviceName: "Knotless Braids",
			preferredDate: new Date("2099-10-10T00:00:00.000Z"),
			preferredTime: "10:00 AM",
			preferredStylist: null,
		})
		transactionMock.booking.create.mockImplementation(async ({ data }: { data: { status: BookingStatus } }) => ({ id: "booking-a", status: data.status }))
		transactionMock.waitlistEntry.updateMany.mockResolvedValue({ count: 1 })
	})

	it("creates a WAITLISTED booking without locking the already-booked slot or collecting payment", async () => {
		const booking = await createPublicBooking(input)

		expect(booking).toEqual({ id: "booking-a", status: BookingStatus.WAITLISTED, payment: undefined })
		expect(transactionMock.booking.create).toHaveBeenCalledWith(expect.objectContaining({
			data: expect.objectContaining({ status: BookingStatus.WAITLISTED, appointmentDate: new Date("2099-10-10T00:00:00.000Z") }),
		}))
		expect(transactionMock.bookingSlot.create).not.toHaveBeenCalled()
		expect(transactionMock.bookingPayment.create).not.toHaveBeenCalled()
		expect(transactionMock.waitlistEntry.updateMany).toHaveBeenCalledWith({
			where: { id: "waitlist-a", tenantId: "tenant-a", linkedBookingId: null },
			data: { linkedBookingId: "booking-a" },
		})
	})

	it("rejects confirmation if customer details no longer match the waitlist request", async () => {
		await expect(createPublicBooking({ ...input, email: "other@example.com" })).rejects.toThrow("must match the waitlist request")
		expect(transactionMock.booking.create).not.toHaveBeenCalled()
	})
})
