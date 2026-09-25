import { describe, expect, it } from "vitest"

import { galleryMutationSchema } from "../../shared/validation/merchant"

describe("legacy gallery admin save contract", () => {
	it("accepts the complete native payload for a braids style", () => {
		const result = galleryMutationSchema.safeParse({
			tenantSlug: "royal-braids",
			categoryKey: "braids-services",
			styleName: "Boho Knotless Braids",
			imageUrl: "https://cdn.example.com/gallery/boho.webp",
			beforeImageUrl: "https://cdn.example.com/gallery/before.webp",
			styleType: "Knotless",
			serviceName: "Knotless Braids",
			length: "Long",
			size: "Medium",
			hairType: "20-inch human blend",
			stylistName: "Zainab Mohamed",
			timeTaken: "4 hours",
			priceRange: "KSh 4,000 - 6,000",
			featuredTrending: true,
			featuredMostBooked: false,
			published: true,
		})

		expect(result.success).toBe(true)
	})

	it("rejects a new style without a final image URL", () => {
		const result = galleryMutationSchema.safeParse({
			tenantSlug: "royal-braids",
			styleName: "Boho Knotless Braids",
			styleType: "Knotless",
			published: true,
		})

		expect(result.success).toBe(false)
	})
})
