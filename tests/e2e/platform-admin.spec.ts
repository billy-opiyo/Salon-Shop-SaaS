import { expect, test } from "@playwright/test"

test.describe("Beauty Sphia platform admin boundary", () => {
	test("redirects unauthenticated operators to sign in", async ({ page }) => {
		await page.goto("/platform-admin")
		await expect(page).toHaveURL(/\/login$/)
	})

	test("rejects unauthenticated operator mutations", async ({ request }) => {
		const response = await request.post("/api/platform-admin/actions", {
			data: { action: "suspend-tenant", id: "tenant-test" },
		})
		expect(response.status()).toBe(401)
	})
})
