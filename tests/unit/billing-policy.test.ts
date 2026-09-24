import { describe, expect, it } from "vitest"

import {
	BILLING_POLICY,
	addCalendarMonths,
} from "../../shared/constants/plans"

describe("Beauty Sphia billing policy", () => {
	it("uses six calendar months for the post-setup free period", () => {
		const start = new Date("2026-01-15T10:30:00.000Z")

		expect(BILLING_POLICY.freeUsageMonths).toBe(6)
		expect(addCalendarMonths(start, BILLING_POLICY.freeUsageMonths)).toEqual(
			new Date("2026-07-15T10:30:00.000Z"),
		)
	})

	it("clamps month-end dates instead of overflowing into another month", () => {
		const start = new Date("2026-08-31T10:30:00.000Z")

		expect(addCalendarMonths(start, 6)).toEqual(
			new Date("2027-02-28T10:30:00.000Z"),
		)
	})
})
