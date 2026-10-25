import { expect, test } from "@playwright/test"

type CapturedRequest = {
	url: string
	body: Record<string, unknown>
	includesInspiration: boolean
}

function captureRequest(request: import("@playwright/test").Request): CapturedRequest {
	const contentType = request.headers()["content-type"] ?? ""
	if (!contentType.includes("multipart/form-data")) {
		return {
			url: request.url(),
			body: request.postDataJSON() as Record<string, unknown>,
			includesInspiration: false,
		}
	}
	const raw = request.postData() ?? ""
	const body: Record<string, unknown> = {}
	for (const key of ["tenantSlug", "name", "firstName", "lastName", "email", "phone", "serviceName", "preferredDate", "preferredTime", "appointmentDate", "timeLabel", "waitlistId", "turnstileToken"]) {
		const match = raw.match(new RegExp(`name="${key}"\\r\\n\\r\\n([^\\r\\n]+)`))
		if (match?.[1]) body[key] = match[1]
	}
	return {
		url: request.url(),
		body,
		includesInspiration: raw.includes('name="inspirationImage"') && raw.includes('filename="style-reference.png"'),
	}
}

test.describe("storefront booking availability and waitlist", () => {
	test("blocks booked times and links a waitlist join to its confirmed request", async ({ page }) => {
		const requests: CapturedRequest[] = []
		const waitlistId = `c${"a".repeat(24)}`
		const future = new Date()
		future.setDate(future.getDate() + 5)
		const appointmentDate = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`
		await page.addInitScript(() => localStorage.setItem("royal_braids_terms_accepted_v1", "true"))
		await page.route("**/api/bookings/availability?**", async (route) => {
			await route.fulfill({
				json: {
					timeSlots: ["9:00 AM", "9:30 AM", "10:00 AM"],
					bookedSlots: [{ slotId: "slot-10", timeLabel: "10:00 AM", stylistId: null, stylistLabel: "Booked" }],
				},
			})
		})
		await page.route("**/api/waitlist", async (route) => {
			requests.push(captureRequest(route.request()))
			await route.fulfill({ status: 201, json: { waitlistId, queuePosition: 1, status: "WAITING" } })
		})
		await page.route("**/api/bookings", async (route) => {
			requests.push(captureRequest(route.request()))
			await route.fulfill({ status: 201, json: { bookingId: "booking-test", status: "WAITLISTED", payment: null } })
		})

		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.locator("#datePicker").fill(appointmentDate)
		await expect(page.locator("#waitlistPanel")).toBeVisible()
		await page.locator("#timePickerTrigger").click()
		await expect(page.locator("#bookingTimeDropdown").getByRole("option", { name: "10:00 AM — Booked" })).toBeDisabled()
		await page.locator("#bookingTimeDropdown").getByRole("option", { name: "9:30 AM" }).click()
		await expect(page.locator("#timeSelect")).toHaveValue("9:30 AM")

		await page.locator('#bookingForm [name="firstName"]').fill("Amina")
		await page.locator('#bookingForm [name="lastName"]').fill("Client")
		await page.locator('#bookingForm [name="email"]').fill("amina@example.com")
		await page.locator('#bookingForm [name="phone"]').fill("+254700000000")
		const serviceSelect = page.locator("#serviceSelect")
		const serviceOptions = await serviceSelect.locator("option").evaluateAll(
			(options) =>
				options
					.filter(
						(option) =>
							!(option as HTMLOptionElement).disabled &&
							Boolean((option as HTMLOptionElement).value),
					)
					.map((option) => (option as HTMLOptionElement).value),
		)
		const customServiceValue = "__custom_service__"
		if (serviceOptions.includes(customServiceValue)) {
			await serviceSelect.selectOption(customServiceValue)
			await page.locator("#customServiceInput").fill("Protective Styling")
		} else {
			const firstService = serviceOptions.find(
				(value) => value !== customServiceValue,
			)
			if (!firstService) throw new Error("No bookable service option is rendered")
			await serviceSelect.selectOption(firstService)
		}
		await page.locator("#inspirationImage").setInputFiles({
			name: "style-reference.png",
			mimeType: "image/png",
			buffer: Buffer.from("mock inspiration image"),
		})
		await page.locator("#bookingForm").evaluate((form) => {
			const input = document.createElement("input")
			input.type = "hidden"
			input.name = "turnstileToken"
			input.value = "test-turnstile-token"
			form.append(input)
		})

		await page.locator("#waitlistTimeSelect").selectOption("slot-10")
		await page.locator("#joinWaitlistBtn").click()
		await expect(page.locator("#bookingMessage")).toContainText("Confirm below")
		await expect(page.locator("#timeSelect")).toHaveValue("10:00 AM")
		await page.locator("#submitBtn").click()
		await expect(page.locator("#bookingSuccess h3")).toHaveText("You’re on the Waitlist")

		expect(requests[0]?.body).toMatchObject({ preferredDate: appointmentDate, preferredTime: "10:00 AM" })
		expect(requests[0]?.includesInspiration).toBe(true)
		expect(requests[1]?.body).toMatchObject({ waitlistId, appointmentDate, timeLabel: "10:00 AM" })
		expect(requests[1]?.includesInspiration).toBe(false)
	})

	test("uploads an optional inspiration photo with a normal booking", async ({ page }) => {
		const future = new Date()
		future.setUTCDate(future.getUTCDate() + 5)
		const appointmentDate = future.toISOString().slice(0, 10)
		let bookingRequest: CapturedRequest | undefined
		await page.addInitScript(() => localStorage.setItem("royal_braids_terms_accepted_v1", "true"))
		await page.route("**/api/bookings/availability?**", async (route) => {
			await route.fulfill({ json: { timeSlots: ["9:00 AM"], bookedSlots: [] } })
		})
		await page.route("**/api/bookings", async (route) => {
			bookingRequest = captureRequest(route.request())
			await route.fulfill({ status: 201, json: { bookingId: "booking-image", status: "PENDING", payment: null } })
		})

		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.locator('#bookingForm [name="firstName"]').fill("Amina")
		await page.locator('#bookingForm [name="lastName"]').fill("Client")
		await page.locator('#bookingForm [name="email"]').fill("amina@example.com")
		await page.locator('#bookingForm [name="phone"]').fill("+254700000000")
		const serviceSelect = page.locator("#serviceSelect")
		const serviceOptions = await serviceSelect.locator("option").evaluateAll(
			(options) =>
				options
					.filter(
						(option) =>
							!(option as HTMLOptionElement).disabled &&
							Boolean((option as HTMLOptionElement).value),
					)
					.map((option) => (option as HTMLOptionElement).value),
		)
		if (serviceOptions.includes("__custom_service__")) {
			await serviceSelect.selectOption("__custom_service__")
			await page.locator("#customServiceInput").fill("Protective Styling")
		} else {
			const firstService = serviceOptions[0]
			if (!firstService) throw new Error("No bookable service option is rendered")
			await serviceSelect.selectOption(firstService)
		}
		const availabilityResponse = page.waitForResponse((response) =>
			response.url().includes("/api/bookings/availability?") &&
			response.request().method() === "GET",
		)
		await page.locator("#datePicker").fill(appointmentDate)
		await availabilityResponse
		await expect(page.locator("#bookingTimeDropdown .time-picker-option").first()).toBeAttached()
		await page.locator("#timePickerTrigger").click()
		await page.locator("#bookingTimeDropdown").getByRole("option", { name: "9:00 AM" }).click()
		await page.locator("#inspirationImage").setInputFiles({
			name: "style-reference.png",
			mimeType: "image/png",
			buffer: Buffer.from("mock inspiration image"),
		})
		await page.locator("#bookingForm").evaluate((form) => {
			const input = document.createElement("input")
			input.type = "hidden"
			input.name = "turnstileToken"
			input.value = "test-turnstile-token"
			form.append(input)
		})
		await page.locator("#submitBtn").click()
		await expect(page.locator("#bookingSuccess")).toBeVisible()
		expect(bookingRequest?.body).toMatchObject({ appointmentDate, timeLabel: "9:00 AM" })
		expect(bookingRequest?.includesInspiration).toBe(true)
	})
})
