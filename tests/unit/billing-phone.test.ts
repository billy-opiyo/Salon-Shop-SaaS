import { describe, expect, it } from "vitest"

import { normalizeKenyanMpesaPhone } from "../../shared/validation/mpesa"

describe("normalizeKenyanMpesaPhone", () => {
	it("normalizes common Kenyan formats", () => {
		expect(normalizeKenyanMpesaPhone("0712 345 678")).toBe("254712345678")
		expect(normalizeKenyanMpesaPhone("712345678")).toBe("254712345678")
		expect(normalizeKenyanMpesaPhone("+254 712 345 678")).toBe("254712345678")
	})

	it("rejects invalid numbers", () => {
		expect(() => normalizeKenyanMpesaPhone("0201234567")).toThrow()
	})
})
