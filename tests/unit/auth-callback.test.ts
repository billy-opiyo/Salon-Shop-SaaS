import { describe, expect, it } from "vitest"

import {
	getLoginUrlForPath,
	getSafeAuthCallbackUrl,
} from "../../shared/authCallback"

describe("safe authentication callbacks", () => {
	it("preserves internal merchant destinations and their query strings", () => {
		expect(getSafeAuthCallbackUrl("/manage/royal-braids/gallery?sort=newest")).toBe(
			"/manage/royal-braids/gallery?sort=newest",
		)
		expect(getLoginUrlForPath("/manage/royal-braids")).toBe(
			"/login?callbackUrl=%2Fmanage%2Froyal-braids",
		)
	})

	it.each([
		"https://attacker.example",
		"//attacker.example/path",
		"/\\attacker.example/path",
		"/login",
		"/manage-other/path",
	])("falls back instead of accepting unsafe callback %s", (candidate) => {
		expect(getSafeAuthCallbackUrl(candidate)).toBe("/manage")
	})
})
