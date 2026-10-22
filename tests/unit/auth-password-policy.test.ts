import { describe, expect, it } from "vitest"

import {
	credentialsSchema,
	passwordChangeSchema,
	signupSchema,
} from "../../shared/validation/auth"

describe("legacy-compatible password policies", () => {
	it("allows existing short passwords at sign-in without weakening signup", () => {
		expect(
			credentialsSchema.safeParse({ email: "owner@example.com", password: "Short7!" })
				.success,
		).toBe(true)
		expect(
			signupSchema.safeParse({
				name: "Salon Owner",
				email: "owner@example.com",
				password: "Short7!",
				turnstileToken: "verified-token",
			}).success,
		).toBe(false)
	})

	it("allows legacy-compliant password changes and rejects weak new passwords", () => {
		expect(
			passwordChangeSchema.safeParse({
				currentPassword: "short-old-password",
				newPassword: "NewPass7",
			}).success,
		).toBe(true)
		expect(
			passwordChangeSchema.safeParse({
				currentPassword: "short-old-password",
				newPassword: "weakpass",
			}).success,
		).toBe(false)
	})
})
