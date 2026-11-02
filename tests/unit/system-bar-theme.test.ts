import { describe, expect, it } from "vitest"

import { isLightColor, normalizeCssColor } from "../../frontend/lib/systemBarTheme"

describe("system bar theme colors", () => {
	it("normalizes CSS hex and computed RGB colors to native hex", () => {
		expect(normalizeCssColor("#F7F")).toBe("#ff77ff")
		expect(normalizeCssColor("#F7F2EA")).toBe("#f7f2ea")
		expect(normalizeCssColor("rgb(247, 242, 234)")).toBe("#f7f2ea")
		expect(normalizeCssColor("rgba(10, 10, 10, 0)")).toBeNull()
	})

	it("chooses contrasting system icon colors for light and dark page surfaces", () => {
		expect(isLightColor("#f7f2ea")).toBe(true)
		expect(isLightColor("#0a0a0a")).toBe(false)
	})
})
