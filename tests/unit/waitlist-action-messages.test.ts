import { describe, expect, it } from "vitest"

import {
	WAITLIST_SLOT_OCCUPIED_MESSAGE,
	WAITLIST_SLOT_OCCUPIED_REASON,
	buildWaitlistSlotOccupiedDetails,
} from "@shared/constants/waitlistActionMessages"

describe("waitlist action messages", () => {
	it("preserves the legacy occupied-slot message and details", () => {
		expect(WAITLIST_SLOT_OCCUPIED_MESSAGE).toContain(
			"preferred slot is still occupied",
		)
		expect(WAITLIST_SLOT_OCCUPIED_MESSAGE).toContain(
			"Cancel or release the existing booking first",
		)
		expect(
			buildWaitlistSlotOccupiedDetails({
				slotId: " slot-1 ",
				currentBookingId: " booking-1 ",
				waitlistBookingId: " waitlist-1 ",
			}),
		).toEqual({
			reason: WAITLIST_SLOT_OCCUPIED_REASON,
			slotId: "slot-1",
			currentBookingId: "booking-1",
			waitlistBookingId: "waitlist-1",
		})
	})

	it("normalizes missing structured detail values", () => {
		expect(buildWaitlistSlotOccupiedDetails()).toEqual({
			reason: WAITLIST_SLOT_OCCUPIED_REASON,
			slotId: "",
			currentBookingId: "",
			waitlistBookingId: "",
		})
	})
})
