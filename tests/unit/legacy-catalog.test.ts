import { describe, expect, it } from "vitest"

import {
	DEFAULT_SALON_BLOGS,
	DEFAULT_SALON_CATEGORIES,
	DEFAULT_SALON_GALLERY,
	DEFAULT_SALON_REVIEWS,
	DEFAULT_SALON_SERVICES,
	slugifyDefaultService,
} from "@shared/constants/legacySalonCatalog"

describe("legacy salon catalog parity", () => {
	it("keeps the complete reference catalog and fallback content", () => {
		expect(DEFAULT_SALON_CATEGORIES).toHaveLength(10)
		expect(DEFAULT_SALON_SERVICES).toHaveLength(55)
		expect(DEFAULT_SALON_GALLERY).toHaveLength(14)
		expect(DEFAULT_SALON_REVIEWS).toHaveLength(6)
		expect(DEFAULT_SALON_BLOGS).toHaveLength(6)
		expect(DEFAULT_SALON_SERVICES.map((service) => service.name)).toContain(
			"Cocoa Glow Body Butter",
		)
	})

	it("does not create duplicate service slugs", () => {
		const slugs = DEFAULT_SALON_SERVICES.map((service) =>
			slugifyDefaultService(service.name),
		)
		expect(new Set(slugs).size).toBe(slugs.length)
	})
})
