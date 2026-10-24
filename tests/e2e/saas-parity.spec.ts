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

	test("blog Next reveals the remaining posts before advancing", async ({ page }) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		const cards = page.locator("#blogGrid .blog-card")
		expect(await cards.count()).toBeGreaterThan(3)
		await expect
			.poll(() =>
				cards.evaluateAll(
					(items) =>
						items.filter((item) => getComputedStyle(item).display !== "none")
							.length,
				),
			)
			.toBe(3)
		await page.locator("#blogNextBtn").click()
		await expect(cards.nth(3)).toBeVisible()
		await expect(page.locator("#viewLessBlogsBtn")).toBeVisible()
	})

	test("gallery service filters preserve every legacy category", async ({ page }) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		const filterValues = await page
			.locator('#galleryServiceFilters [data-filter-group="service"]')
			.evaluateAll((chips) => chips.map((chip) => chip.getAttribute("data-filter-value")))
		expect(filterValues).toEqual([
			"all",
			"braids-services",
			"hair-services",
			"beauty-spa-services",
			"nail-services",
			"makeup-services",
			"barber-services",
			"massage-wellness",
			"eyebrow-lash-services",
			"bridal-event-packages",
			"cosmetics-products",
		])
	})

	test("gallery Book Now carries unlisted service names into custom booking", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForFunction(() =>
			Boolean((window as unknown as { CLIENT_CONFIG?: unknown }).CLIENT_CONFIG),
		)
		const unmatchedGalleryIndex = await page.locator(".gallery-item").evaluateAll(
			(items) => {
				const serviceSelect = document.querySelector<HTMLSelectElement>("#serviceSelect")
				if (!serviceSelect) return -1
				return items.findIndex((item) => {
					const serviceName = item.getAttribute("data-gallery-sub-service")?.trim()
					return Boolean(
						serviceName &&
						!Array.from(serviceSelect.options).some(
							(option) => option.value === serviceName,
						),
					)
				})
			},
		)
		expect(unmatchedGalleryIndex).toBeGreaterThanOrEqual(0)
		const galleryItem = page.locator(".gallery-item").nth(unmatchedGalleryIndex)
		const serviceName = await galleryItem.getAttribute("data-gallery-sub-service")
		await galleryItem.click()
		await expect(page.locator("#lightbox")).toHaveClass(/active/)
		await page.locator("#lightboxBookNow").click()
		await expect(page.locator("#lightbox")).not.toHaveClass(/active/)
		await expect(page.locator("#serviceSelect")).toHaveValue("__custom_service__")
		await expect(page.locator("#customServiceGroup")).toBeVisible()
		await expect(page.locator("#customServiceInput")).toHaveValue(serviceName ?? "")
		await expect(page.locator("#customServiceInput")).toHaveAttribute("required", "")
	})

	test("visit section preserves the legacy map embed and contact actions", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		const visit = page.locator("#visit")
		const map = visit.locator("iframe")
		await expect(map).toHaveAttribute(
			"src",
			/^https:\/\/www\.google\.com\/maps\/embed\?pb=/,
		)
		await expect(map).toHaveAttribute("src", /Westlands%2C\+Nairobi/)
		await expect(visit.locator('a[href="tel:+254740470381"]')).toBeVisible()
		await expect(visit.locator('a[href="mailto:info@royalbraids.ke"]')).toBeVisible()
		await expect(
			visit.locator('a[href="mailto:bookings@royalbraids.ke"]'),
		).toBeVisible()
	})

	test("storefront in-page navigation links point to rendered sections", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		const brokenTargets = await page.locator('a[href^="#"]').evaluateAll((links) =>
			links.flatMap((link) => {
				const href = link.getAttribute("href") ?? ""
				const targetId = decodeURIComponent(href.slice(1))
				return targetId && !document.getElementById(targetId)
					? [{ text: link.textContent?.trim() ?? "", href }]
					: []
			}),
		)
		expect(brokenTargets).toEqual([])
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
		expect(await page.locator(".lead").innerText()).toContain(
			"Royal Braids Vercel-hosted website",
		)
		expect(await page.locator(".footer-note").innerText()).toContain(
			"All rights reserved. This custom 404 page",
		)
	})

	test("missing salon verification token shows the legacy recovery error", async ({
		page,
	}) => {
		await page.goto("/verify-email?tenant=royal-braids", {
			waitUntil: "domcontentloaded",
		})
		await expect(page.locator("#salonVerifyTitle")).toContainText(
			"Verify your email",
		)
		await expect(page.locator(".salon-verify-message")).toHaveText(
			"This verification link is incomplete. Request a new email and try again.",
		)
		await expect(page.getByRole("button", { name: "Verify email" })).toBeDisabled()
		await expect(
			page.getByRole("link", { name: "Return to website" }),
		).toHaveAttribute("href", "/royal-braids#home")
	})

	test("unauthenticated admin access redirects to login", async ({ page }) => {
		await page.goto("/manage/royal-braids", { waitUntil: "domcontentloaded" })
		await expect(page).toHaveURL(
			/\/login\?callbackUrl=%2Fmanage%2Froyal-braids$/,
		)
	})

	const ownerEmail = process.env.SAAS_E2E_OWNER_EMAIL
	const ownerPassword = process.env.SAAS_E2E_OWNER_PASSWORD
	test("authenticated owner can open the admin workspace and read its snapshot", async ({
		page,
	}) => {
		test.skip(
			!ownerEmail || !ownerPassword,
			"Configure a dedicated non-production owner account to run this read-only workflow.",
		)
		await page.goto("/login?callbackUrl=%2Fmanage%2Froyal-braids", {
			waitUntil: "domcontentloaded",
		})
		await page.getByLabel("Email", { exact: true }).fill(ownerEmail ?? "")
		await page.getByLabel("Password", { exact: true }).fill(ownerPassword ?? "")
		await page.getByRole("button", { name: "Log In", exact: true }).click()
		await expect(page).toHaveURL(/\/manage\/royal-braids$/)
		await expect(
			page.getByRole("heading", {
				name: "Content, Bookings & Security Management",
			}),
		).toBeVisible()
		const sessionResponse = await page.request.get("/api/manage/royal-braids/snapshot")
		expect(sessionResponse.status()).toBe(200)
		const snapshot = await sessionResponse.json()
		expect(snapshot).toHaveProperty("bookings")
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
