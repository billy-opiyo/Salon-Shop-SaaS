import { describe, expect, it } from "vitest"

import { hostnameSchema } from "../../shared/validation/domain"

describe("hostnameSchema", () => {
	it("normalizes valid public hostnames", () => {
		expect(hostnameSchema.parse(" Salon.Example.com. ")).toBe(
			"salon.example.com",
		)
	})

	it("rejects URLs, IP addresses, and malformed hostnames", () => {
		for (const value of [
			"https://salon.example.com",
			"127.0.0.1",
			"*.example.com",
			"salon..example.com",
		])
			expect(hostnameSchema.safeParse(value).success).toBe(false)
	})
})
