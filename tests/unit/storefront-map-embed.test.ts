import { describe, expect, it } from "vitest"

import { DEFAULT_STOREFRONT_DESIGN } from "../../shared/constants/storefrontDesign"
import { safeMapEmbedUrl } from "../../shared/safeMapEmbedUrl"
import { storefrontDesignUpdateSchema } from "../../shared/validation/settings"

describe("storefront map embed URL safety", () => {
	it("preserves the existing HTTPS map URL", () => {
		expect(
			safeMapEmbedUrl(
				DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl,
				"https://www.google.com/maps/embed",
			),
		).toBe(DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl)
		expect(
			storefrontDesignUpdateSchema.safeParse({
				storefrontConfig: {
					mapEmbedUrl: DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl,
				},
			}).success,
		).toBe(true)
	})

	it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "http://example.com/map"])(
		"rejects unsafe configured map URL %s and uses the default at render time",
		(mapUrl) => {
			expect(
				storefrontDesignUpdateSchema.safeParse({
					storefrontConfig: { mapEmbedUrl: mapUrl },
				}).success,
			).toBe(false)
			expect(
				safeMapEmbedUrl(mapUrl, DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl),
			).toBe(DEFAULT_STOREFRONT_DESIGN.mapEmbedUrl)
		},
	)
})
