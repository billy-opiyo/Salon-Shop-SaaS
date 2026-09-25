import { expect, test } from "@playwright/test"

test.describe("Royal Braids SaaS parity", () => {
	test("storefront loads local hero and gallery images", async ({ page }) => {
		const failedImageRequests: string[] = []
		page.on("response", (response) => {
			if (
				response.request().resourceType() === "image" &&
				response.status() >= 400
			) {
				failedImageRequests.push(response.url())
			}
		})

		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await expect(page.locator("#home")).toBeVisible()
		await expect(page.locator("#gallery")).toBeVisible()
		await page.waitForTimeout(1_000)
		expect(failedImageRequests).toEqual([])
	})

	test("storefront remains usable at mobile width", async ({ page }) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await expect(page.locator("#home")).toBeVisible()
		const documentWidth = await page.evaluate(
			() => document.documentElement.scrollWidth,
		)
		const viewportWidth = await page.evaluate(() => window.innerWidth)
		expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1)
	})

	test("storefront does not load archived reference runtime assets", async ({
		page,
	}) => {
		const legacyRequests: string[] = []
		page.on("request", (request) => {
			if (/\/reference\/(JS|CSS|IMG)|index\.html|admin\.html/i.test(request.url())) {
				legacyRequests.push(request.url())
			}
		})

		await page.goto("/royal-braids", { waitUntil: "networkidle" })
		await expect(page.locator(".salon-storefront-root")).toBeVisible()
		expect(legacyRequests).toEqual([])
	})

	test("not-found page is rendered by native Next markup", async ({ page }) => {
		const response = await page.goto("/native-missing-page", {
			waitUntil: "domcontentloaded",
		})
		expect(response?.status()).toBe(404)
		await expect(page.locator("#page-title")).toContainText("not found")
		await expect(page.getByRole("link", { name: "Back to home" })).toBeVisible()
	})

	test("unauthenticated admin access redirects to login", async ({ page }) => {
		await page.goto("/manage/royal-braids", { waitUntil: "domcontentloaded" })
		await expect(page).toHaveURL(/\/login$/)
	})

	test("admin action routes reject unauthenticated mutation", async ({
		request,
	}) => {
		const response = await request.post("/api/manage/royal-braids/actions", {
			data: { action: "booking-status", id: "ckxxxxxxxxxxxxxxxxxxxxxxxx" },
		})
		expect(response.status()).toBe(401)
	})

	test("gallery Save mutations reject unauthenticated requests", async ({
		request,
	}) => {
		const response = await request.post("/api/manage/royal-braids/actions", {
			data: {
				action: "gallery-create",
				categoryKey: "braids-services",
				styleName: "Contract Test Style",
				styleType: "Knotless",
				imageUrl: "https://cdn.example.com/gallery/contract-test.webp",
				published: true,
			},
		})
		expect(response.status()).toBe(401)
	})

	test("domain management rejects unauthenticated registration", async ({
		request,
	}) => {
		const response = await request.post("/api/manage/royal-braids/domains", {
			data: { action: "register", host: "salon.example.com" },
		})
		expect(response.status()).toBe(401)
	})

	test("media signing rejects unauthenticated uploads", async ({ request }) => {
		const response = await request.post("/api/manage/royal-braids/media", {
			data: {
				fileName: "gallery.jpg",
				mimeType: "image/jpeg",
				byteSize: 1024,
				kind: "GALLERY",
			},
		})
		expect(response.status()).toBe(401)
	})
})
