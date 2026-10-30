import { expect, test } from "@playwright/test"

async function setTurnstileToken(form: import("@playwright/test").Locator) {
	await form.evaluate((element) => {
		const input = element.querySelector<HTMLInputElement>(
			'input[name="turnstileToken"]',
		)
		if (input) input.value = "test-turnstile-token"
	})
}

test.describe("storefront contact and review submissions", () => {
	test("contact message shows sending state, inline confirmation, and success popup", async ({
		page,
	}) => {
		let requestBody: Record<string, unknown> | undefined
		let releaseResponse!: () => void
		const responseGate = new Promise<void>((resolve) => {
			releaseResponse = resolve
		})
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.route("**/api/contact", async (route) => {
			requestBody = route.request().postDataJSON() as Record<string, unknown>
			await responseGate
			await route.fulfill({ status: 201, json: { messageId: "contact-test", status: "new" } })
		})
		const sessionResponse = page.waitForResponse("**/api/auth/session**")
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await sessionResponse
		const form = page.locator("#contactForm")
		await form.locator('[name="name"]').fill("Jane Doe")
		await form.locator('[name="email"]').fill("jane@example.com")
		await form.locator('[name="subject"]').fill("Appointment question")
		await form.locator('[name="message"]').fill("Please tell me your next available appointment.")
		await setTurnstileToken(form)
		const submit = form.locator('button[type="submit"]')
		const submission = submit.click()
		await expect(submit).toHaveText("Sending...")
		await expect(submit).toBeDisabled()
		releaseResponse()
		await submission
		await expect(submit).toHaveText("Send Message")
		await expect(page.locator("#contactFormMessage")).toHaveText(
			"Thanks, your message has been sent.",
		)
		await expect(page.locator("#contactSuccessPopup")).toHaveClass(/show/)
		expect(requestBody).toMatchObject({
			tenantSlug: "royal-braids",
			name: "Jane Doe",
			email: "jane@example.com",
		})
	})

	test("signed-in review submission sends the name and shows approval feedback", async ({
		page,
	}) => {
		let requestBody: Record<string, unknown> | undefined
		let includesReviewPhoto = false
		let accountRefreshes = 0
		let releaseResponse!: () => void
		const responseGate = new Promise<void>((resolve) => {
			releaseResponse = resolve
		})
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.route("**/api/auth/session**", async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ user: { name: "Test Client", email: "client@example.com" } }),
			})
		})
		await page.route("**/api/reviews", async (route) => {
			const request = route.request()
			if (request.headers()["content-type"]?.includes("multipart/form-data")) {
				const raw = request.postData() ?? ""
				includesReviewPhoto = raw.includes('name="reviewPhoto"') && raw.includes('filename="review-photo.png"')
				requestBody = {}
				for (const key of ["tenantSlug", "name", "rating", "serviceName", "text", "turnstileToken"]) {
					const value = raw.match(new RegExp(`name="${key}"\\r\\n\\r\\n([^\\r\\n]+)`))?.[1]
					if (value) requestBody[key] = key === "rating" ? Number(value) : value
				}
			} else {
				requestBody = request.postDataJSON() as Record<string, unknown>
			}
			await responseGate
			await route.fulfill({ status: 201, json: { reviewId: "review-test", status: "pending" } })
		})
		await page.route("**/api/account?tenantSlug=royal-braids", async (route) => {
			accountRefreshes += 1
			await route.fulfill({
				status: 200,
				json: {
					profile: { name: "Test Client", email: "client@example.com", phone: null, image: null },
					preferences: null,
					bookings: [],
					reviews: accountRefreshes > 1 ? [{
						id: "review-test",
						tenantName: "Royal Braids",
						tenantSlug: "royal-braids",
						serviceName: null,
						rating: 5,
						text: "The service was excellent and I loved the final style.",
						status: "pending",
						createdAt: new Date().toISOString(),
					}] : [],
					favorites: [],
					loginHistory: [],
				},
			})
		})
		const sessionResponse = page.waitForResponse("**/api/auth/session**")
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await sessionResponse
		const form = page.locator("#reviewForm")
		await expect(form).toBeVisible()
		await form.locator("#reviewName").fill("Jane Doe")
		await form.locator("#reviewRating").selectOption("5")
		await form.locator("#reviewText").fill("The service was excellent and I loved the final style.")
		await form.locator("#reviewPhoto").setInputFiles({
			name: "review-photo.png",
			mimeType: "image/png",
			buffer: Buffer.from("image bytes"),
		})
		await setTurnstileToken(form)
		const submit = page.locator("#submitReviewBtn")
		const submission = submit.click()
		await expect(submit).toHaveText("Submitting...")
		await expect(submit).toBeDisabled()
		releaseResponse()
		await submission
		await expect(submit).toHaveText("Submit Review")
		await expect(page.locator("#reviewMessage")).toHaveText(
			"Thank you! Your review was submitted and is pending approval.",
		)
		await expect.poll(() => accountRefreshes).toBeGreaterThan(1)
		await expect(page.locator("#dashboardReviewsList")).toContainText(
			"The service was excellent and I loved the final style.",
		)
		expect(requestBody).toMatchObject({
			tenantSlug: "royal-braids",
			name: "Jane Doe",
			rating: 5,
		})
		expect(includesReviewPhoto).toBe(true)
	})
})
