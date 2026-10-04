import { describe, expect, it } from "vitest"

import { galleryMutationSchema } from "../../shared/validation/merchant"

describe("legacy gallery admin save contract", () => {
	const braidsPayload = () => ({
		tenantSlug: "royal-braids",
		categoryKey: "braids-services",
		styleName: "Boho Knotless Braids",
		imageUrl: "https://cdn.example.com/gallery/boho.webp",
		styleType: "Knotless",
		serviceName: "Knotless Braids",
		length: "Long",
		size: "Medium",
		hairType: "20-inch human blend",
		stylistName: "Zainab Mohamed",
		timeTaken: "4 hours",
		published: true,
	})

	it("accepts the complete native payload for a braids style", () => {
		const result = galleryMutationSchema.safeParse({
			...braidsPayload(),
			beforeImageUrl: "https://cdn.example.com/gallery/before.webp",
			priceRange: "KSh 4,000 - 6,000",
			featuredTrending: true,
			featuredMostBooked: false,
			published: true,
		})

		expect(result.success).toBe(true)
	})

	it("rejects a new style without a final image URL", () => {
		const result = galleryMutationSchema.safeParse({
			...braidsPayload(),
			imageUrl: "",
			published: true,
		})

		expect(result.success).toBe(false)
	})

	it("requires products or color mix for hair coloring, relaxing, and treatment", () => {
		for (const hairServiceType of [
			"Hair Coloring",
			"Hair Relaxing",
			"Hair Treatment",
		]) {
			const result = galleryMutationSchema.safeParse({
				...braidsPayload(),
				categoryKey: "hair-services",
				hairServiceType,
				hairTechnique: "Protective finish",
			})
			expect(result.success).toBe(false)
			if (!result.success)
				expect(result.error.issues.map((issue) => issue.path)).toContainEqual([
					"hairProductsUsed",
				])
		}
	})

	it("accepts those hair services when products used are supplied", () => {
		const result = galleryMutationSchema.safeParse({
			...braidsPayload(),
			categoryKey: "hair-services",
			hairServiceType: "Hair Coloring",
			hairTechnique: "Silk press finish",
			hairProductsUsed: "Ammonia-free color + keratin serum",
		})

		expect(result.success).toBe(true)
	})

	it("keeps products optional for hair cutting and removes braids-only requirements", () => {
		const result = galleryMutationSchema.safeParse({
			...braidsPayload(),
			categoryKey: "hair-services",
			hairServiceType: "Hair Cutting",
			hairTechnique: "Layered cut",
		})

		expect(result.success).toBe(true)
	})

	it("keeps the legacy cosmetics exception for service, time, and stylist", () => {
		const result = galleryMutationSchema.safeParse({
			tenantSlug: "royal-braids",
			categoryKey: "cosmetics-products",
			styleName: "Nourish & Shine Hair Oil",
			styleType: "Hair Oil",
			imageUrl: "https://cdn.example.com/gallery/hair-oil.webp",
			published: true,
		})

		expect(result.success).toBe(true)
	})

	it("rejects unsupported gallery categories", () => {
		const result = galleryMutationSchema.safeParse({
			...braidsPayload(),
			categoryKey: "unknown-category",
		})

		expect(result.success).toBe(false)
	})
})
