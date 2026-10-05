import { describe, expect, it } from "vitest"

import { BOOKING_TIME_SLOTS } from "../../shared/constants/bookingAvailability"
import { bookingRequestSchema, waitlistRequestSchema } from "../../shared/validation/booking"

const booking = {
	tenantSlug: "royal-braids",
	firstName: "Amina",
	lastName: "Client",
	email: "amina@example.com",
	phone: "+254700000000",
	serviceName: "Knotless Braids",
	appointmentDate: "2026-10-10",
	timeLabel: "10:00 AM",
	turnstileToken: "test-token",
}

describe("public booking time validation", () => {
	it("keeps the complete 30-minute legacy schedule", () => {
		expect(BOOKING_TIME_SLOTS).toHaveLength(23)
		expect(BOOKING_TIME_SLOTS[0]).toBe("8:00 AM")
		expect(BOOKING_TIME_SLOTS.at(-1)).toBe("7:00 PM")
	})

	it("accepts canonical time slots and linked waitlist IDs", () => {
		expect(bookingRequestSchema.safeParse({ ...booking, waitlistId: `c${"a".repeat(24)}` }).success).toBe(true)
	})

	it("rejects arbitrary or malformed times on both public endpoints", () => {
		expect(bookingRequestSchema.safeParse({ ...booking, timeLabel: "11:17 AM" }).success).toBe(false)
		expect(waitlistRequestSchema.safeParse({
			tenantSlug: "royal-braids",
			name: "Amina Client",
			email: "amina@example.com",
			phone: "+254700000000",
			serviceName: "Knotless Braids",
			preferredDate: "2026-10-10",
			preferredTime: "11:17 AM",
			turnstileToken: "test-token",
		}).success).toBe(false)
	})
})
