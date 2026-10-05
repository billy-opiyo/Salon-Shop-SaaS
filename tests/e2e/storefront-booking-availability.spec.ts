import { expect, test } from "@playwright/test"

test.describe("storefront booking availability and waitlist", () => {
	test("blocks booked times and links a waitlist join to its confirmed request", async ({ page }) => {
		const requests: { url: string; body?: Record<string, unknown> }[] = []
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
			requests.push({ url: route.request().url(), body: route.request().postDataJSON() as Record<string, unknown> })
			await route.fulfill({ status: 201, json: { waitlistId, queuePosition: 1, status: "WAITING" } })
		})
		await page.route("**/api/bookings", async (route) => {
			requests.push({ url: route.request().url(), body: route.request().postDataJSON() as Record<string, unknown> })
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
		await page.locator("#serviceSelect").selectOption({ index: 1 })
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
		expect(requests[1]?.body).toMatchObject({ waitlistId, appointmentDate, timeLabel: "10:00 AM" })
	})
})
