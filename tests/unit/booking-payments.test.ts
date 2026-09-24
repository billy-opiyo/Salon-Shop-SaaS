import { describe, expect, it } from "vitest"

import {
	calculateBookingPaymentAmount,
	resolveBookingPaymentPlan,
} from "../../shared/constants/bookingPayments"

describe("storefront booking payments", () => {
	it("calculates the approved partial and full amounts", () => {
		expect(calculateBookingPaymentAmount("partial", 450000, 50)).toBe(225000)
		expect(calculateBookingPaymentAmount("full", 450000, 50)).toBe(450000)
	})

	it("creates a deferred after-service plan without an expiry", () => {
		const plan = resolveBookingPaymentPlan({
			enabled: true,
			configuredModes: ["after_service"],
			depositPercent: 50,
			servicePriceMinor: 450000,
			orderOnly: false,
			requestedMode: "after_service",
		})

		expect(plan).toMatchObject({
			mode: "after_service",
			amountMinor: 450000,
			status: "deferred",
			expiresAt: null,
		})
	})

	it("never creates payment plans for WhatsApp-only services", () => {
		expect(
			resolveBookingPaymentPlan({
				enabled: true,
				configuredModes: ["partial", "full"],
				depositPercent: 50,
				servicePriceMinor: 450000,
				orderOnly: true,
				requestedMode: "full",
			}),
		).toBeNull()
	})

	it("does not expose online payment when the service has no numeric price", () => {
		expect(() =>
			resolveBookingPaymentPlan({
				enabled: true,
				configuredModes: ["full"],
				depositPercent: 50,
				servicePriceMinor: null,
				orderOnly: false,
				requestedMode: "full",
			}),
		).toThrow("numeric price")
	})
})
