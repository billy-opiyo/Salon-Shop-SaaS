import { expect, test } from "@playwright/test"

test.describe("Requested Beauty Sphia parity fixes", () => {
	test.setTimeout(60_000)

	test("unauthenticated merchant deep links return to the requested admin page after sign-in", async ({
		page,
	}) => {
		await page.goto("/manage/royal-braids/gallery", {
			waitUntil: "domcontentloaded",
		})
		await expect(page).toHaveURL(
			/login\?callbackUrl=%2Fmanage%2Froyal-braids%2Fgallery$/,
		)
		await expect(page.getByRole("heading", { name: "Sign in to your salon workspace" })).toBeVisible()
	})

	test("preserves storefront auth, hero, counters, theme, and WhatsApp states", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("#home")
		await expect(page.locator("#siteSplash")).toHaveCount(0)

		await expect(page.locator("#continueWithGoogleBtn")).toBeAttached()
		await expect(page.locator("#continueWithPhoneBtn")).toHaveCount(0)
		await expect(page.locator("#termsModalCloseBtn")).toBeAttached()
		await expect(page.locator("h1[data-client-html]")).not.toContainText(
			"<span>",
		)
		await expect(page.locator("[data-count]").first()).not.toHaveText("0")
		await expect(page.locator("#floatingWhatsAppButton")).toHaveCSS(
			"color",
			"rgb(244, 255, 247)",
		)
		await page.locator("#termsModalCloseBtn").click()

		const beforeUrl = page.url()
		await page.locator("#darkModeToggle").click()
		await expect(page.locator("html")).toHaveClass(/light-mode/)
		await expect(page).toHaveURL(beforeUrl)
		await expect(page.locator("#authModal")).toHaveAttribute(
			"aria-hidden",
			"true",
		)
	})

	test("floating WhatsApp shortcut follows the selected service and order mode", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		const shortcut = page.locator("#floatingWhatsAppButton")
		const serviceSelect = page.locator("#serviceSelect")

		await serviceSelect.selectOption("Hair Styling")
		const bookingUrl = new URL((await shortcut.getAttribute("href")) ?? "")
		expect(bookingUrl.searchParams.get("text")).toContain(
			"I would like to book Hair Styling (From KSh 1,500).",
		)

		await serviceSelect.selectOption("Nourish & Shine Hair Oil")
		const orderUrl = new URL((await shortcut.getAttribute("href")) ?? "")
		expect(orderUrl.searchParams.get("text")).toContain(
			"I would like to order Nourish & Shine Hair Oil (KSh 1,200).",
		)
	})

	test("guest continuation closes storefront auth and confirms guest mode", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.locator("#openAuthModalBtn").click()
		await expect(page.locator("#authModal")).toHaveAttribute(
			"aria-hidden",
			"false",
		)

		await page.locator("#continueAsGuestBtn").click()
		await expect(page.locator("#authModal")).toHaveAttribute(
			"aria-hidden",
			"true",
		)
		await expect(page.locator("#favoritesToast")).toContainText(
			"You're now continuing as guest",
		)
	})

	test("blog controls toggle between three posts and the full list", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		const cards = page.locator("#blogGrid .blog-card")
		const totalCards = await cards.count()
		expect(totalCards).toBeGreaterThan(3)
		await expect(cards.nth(0)).toBeVisible()
		await expect(cards.nth(2)).toBeVisible()
		await expect(cards.nth(3)).toBeHidden()

		await page.locator("#viewAllBlogsBtn").click()
		await expect(cards.nth(3)).toBeVisible()
		await page.locator("#viewLessBlogsBtn").click()
		await expect(cards.nth(3)).toBeHidden()
	})

	test("gallery sorting restores the eight-item preview and sorts names predictably", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForFunction(() =>
			Boolean((window as unknown as { CLIENT_CONFIG?: unknown }).CLIENT_CONFIG),
		)
		const cards = page.locator("#galleryGrid .gallery-item")
		const totalCards = await cards.count()
		expect(totalCards).toBeGreaterThan(8)

		await page.locator("#viewAllGallery").click()
		await expect(cards.nth(8)).toBeVisible()
		await page.locator("#gallerySortSelect").selectOption("name-asc")
		await expect(cards.nth(7)).toBeVisible()
		await expect(cards.nth(8)).toBeHidden()

		const visibleNames = await cards.evaluateAll((elements) =>
			elements
				.filter((element) => getComputedStyle(element).display !== "none")
				.map((element) => element.querySelector("h4")?.textContent?.trim() ?? ""),
		)
		expect(visibleNames).toHaveLength(8)
		expect(visibleNames).toEqual(
			[...visibleNames].sort((a, b) =>
				a.localeCompare(b, undefined, { sensitivity: "base" }),
			),
		)
	})

	test("review sort modes preserve featured, rating, and recency priorities", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForFunction(() =>
			Boolean((window as unknown as { CLIENT_CONFIG?: unknown }).CLIENT_CONFIG),
		)
		const cards = page.locator("#testimonialsGrid .testimonial-card")
		expect(await cards.count()).toBeGreaterThanOrEqual(3)
		const names = await cards.evaluateAll((elements) =>
			elements.map((element) => element.querySelector("h4")?.textContent?.trim() ?? ""),
		)
		await cards.evaluateAll((elements) => {
			const setup = [
				{ rating: "4", featured: "true", date: "2025-01-01" },
				{ rating: "5", featured: "false", date: "2025-01-03" },
				{ rating: "4", featured: "true", date: "2025-01-02" },
			]
			for (const card of elements) {
				card.dataset.reviewRating = "1"
				card.dataset.reviewFeatured = "false"
				card.dataset.reviewCreatedAt = "2024-01-01"
			}
			for (const [index, card] of elements.slice(0, 3).entries()) {
				const values = setup[index]
				if (!values) continue
				card.dataset.reviewRating = values.rating
				card.dataset.reviewFeatured = values.featured
				card.dataset.reviewCreatedAt = values.date
			}
		})

		const visibleNames = async (): Promise<string[]> =>
			cards.evaluateAll((elements) =>
				elements.map((element) => element.querySelector("h4")?.textContent?.trim() ?? ""),
			)
		await page.locator("#reviewsSortSelect").selectOption("featured")
		await expect.poll(visibleNames).toEqual([names[2], names[0], names[1], ...names.slice(3)])
		await page.locator("#reviewsSortSelect").selectOption("highest-rated")
		await expect.poll(visibleNames).toEqual([names[1], names[2], names[0], ...names.slice(3)])
		await page.locator("#reviewsSortSelect").selectOption("newest")
		await expect.poll(visibleNames).toEqual([names[1], names[2], names[0], ...names.slice(3)])
	})

	test("completes the platform splash and keeps the plan table horizontally scrollable", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.emulateMedia({ reducedMotion: "reduce" })
		await page.goto("/", { waitUntil: "domcontentloaded" })

		await expect(page.locator(".splash-progress-percent")).toHaveText("100%", {
			timeout: 12_000,
		})
		await expect(page.locator(".splash-screen")).toHaveClass(/splash-hide/, {
			timeout: 4_000,
		})
		const tableState = await page
			.locator(".plan-comparison")
			.evaluate((table) => ({
				clientWidth: table.clientWidth,
				scrollWidth: table.scrollWidth,
			}))
		expect(tableState.scrollWidth).toBeGreaterThan(tableState.clientWidth)
	})

	test("keeps the compact platform header inside the viewport", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1050, height: 900 })
		await page.goto("/", { waitUntil: "domcontentloaded" })
		await page.waitForTimeout(5_250)
		const state = await page.evaluate(() => ({
			documentWidth: document.documentElement.scrollWidth,
			viewportWidth: window.innerWidth,
			navDisplay: getComputedStyle(
				document.querySelector(".platform-nav") as Element,
			).display,
		}))
		expect(state.documentWidth).toBeLessThanOrEqual(state.viewportWidth + 1)
		expect(state.navDisplay).toBe("flex")
	})

	test("does not show a second splash after opening a store from the directory", async ({
		page,
	}) => {
		await page.goto("/stores", { waitUntil: "domcontentloaded" })
		await page.getByRole("link", { name: "Open Royal Braids Store →" }).click()
		await expect(page).toHaveURL(/\/royal-braids$/, { timeout: 15_000 })
		await page.waitForSelector("#home")
		await page.waitForTimeout(250)
		const state = await page.evaluate(() => ({
			storefrontSplashCount: document.querySelectorAll("#siteSplash").length,
			bodyHasSplash: document.body.classList.contains("splash-active"),
		}))
		expect(state.storefrontSplashCount).toBe(0)
		expect(state.bodyHasSplash).toBe(false)
	})

	test("mobile Favorites and Account actions open the customer sign-in flow", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("nav.saas-tenant-mobile-actions", {
			state: "attached",
			timeout: 15_000,
		})
		const actionBar = page.locator("nav.saas-tenant-mobile-actions")

		for (const label of ["Favorites", "Account"]) {
			await actionBar.getByRole("link", { name: label }).click()
			await expect(page.locator("#authModal")).toHaveAttribute(
				"aria-hidden",
				"false",
			)
			await expect(page.getByRole("dialog")).toBeVisible()
			await page.getByRole("button", { name: "Close log in modal" }).click()
			await expect(page.locator("#authModal")).toHaveAttribute(
				"aria-hidden",
				"true",
			)
		}
	})

	test("gallery Save prompts guests to sign in after the API rejects the save", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("nav.saas-tenant-mobile-actions", {
			state: "attached",
			timeout: 15_000,
		})
		await page.waitForFunction(() =>
			Boolean((window as unknown as { CLIENT_CONFIG?: unknown }).CLIENT_CONFIG),
		)
		const saveButton = page.locator(".gallery-save-favorite-btn").first()
		await expect(saveButton).toBeAttached()
		await expect(saveButton).toHaveAttribute("data-fav-style-id", /\S+/)
		await saveButton.scrollIntoViewIfNeeded()
		await saveButton.hover()
		const saveRequestPromise = page.waitForRequest(
			(response) =>
				response.url().endsWith("/api/favorites") &&
				response.method() === "POST",
			{ timeout: 10_000 },
		)
		await saveButton.click()
		const saveRequest = await saveRequestPromise
		const saveResponse = await saveRequest.response()
		if (!saveResponse) throw new Error("Gallery favorite request had no response")
		expect(saveResponse.status()).toBe(401)
		await expect(page.locator("#authModal")).toHaveAttribute(
			"aria-hidden",
			"false",
		)
		const category = await saveButton.evaluate(
			(button) => button.closest<HTMLElement>(".gallery-item")?.dataset.galleryService ?? "",
		)
		const categoryLabels: Readonly<Record<string, string>> = {
			"braids-services": "Braids",
			"hair-services": "Hair",
			"beauty-spa-services": "Beauty Spa",
			"nail-services": "Nails",
			"makeup-services": "Makeup",
			"barber-services": "Barber",
			"massage-wellness": "Massage",
			"eyebrow-lash-services": "Eyebrows & Lash",
			"bridal-event-packages": "Bridal / Event Packages",
			"cosmetics-products": "Cosmetics",
		}
		const label = (categoryLabels[category] ?? (category || "Gallery"))
			.replace(/\s+services$/i, "")
			.trim()
			.toLowerCase()
			.replace(/s$/, "")
		await expect(page.locator("#authMessage")).toHaveText(
			"🔐 Log in to save this " + label + " style.",
		)
	})

	test("gallery favorites show saving, saved, removal, and toast feedback", async ({
		page,
	}) => {
		let saveStarted = false
		let releaseSaveResponse!: () => void
		let removeStarted = false
		let releaseRemoveResponse!: () => void
		const saveResponseGate = new Promise<void>((resolve) => {
			releaseSaveResponse = resolve
		})
		const removeResponseGate = new Promise<void>((resolve) => {
			releaseRemoveResponse = resolve
		})
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.route("**/api/favorites", async (route) => {
			if (route.request().method() === "POST") {
				saveStarted = true
				await saveResponseGate
				await route.fulfill({
					status: 201,
					json: { favoriteId: "favorite-test" },
				})
				return
			}
			removeStarted = true
			await removeResponseGate
			await route.fulfill({ status: 204 })
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("nav.saas-tenant-mobile-actions", {
			state: "attached",
			timeout: 15_000,
		})
		await page.waitForFunction(() =>
			Boolean((window as unknown as { CLIENT_CONFIG?: unknown }).CLIENT_CONFIG),
		)
		const saveButton = page.locator(".gallery-save-favorite-btn").first()
		await saveButton.scrollIntoViewIfNeeded()
		const saveRequest = saveButton.click()
		await expect.poll(() => saveStarted, { timeout: 10_000 }).toBe(true)
		await expect(saveButton).toHaveText("Saving…")
		await expect(saveButton).toBeDisabled()
		await expect(saveButton).toHaveAttribute("aria-busy", "true")
		await expect(saveButton).toHaveClass(/btn-loading/)
		await expect
			.poll(() =>
				saveButton.evaluate(
					(button) => getComputedStyle(button, "::after").animationName,
				),
			)
			.toBe("rbButtonSpinner")
		releaseSaveResponse()
		await saveRequest
		await expect(saveButton).toHaveAttribute("aria-pressed", "true")
		await expect(saveButton).toHaveText("♥ Saved")
		await expect(saveButton).not.toHaveClass(/btn-loading/)
		await expect(page.locator("#favoritesToast")).toHaveText(
			"Saved to favorites",
		)

		const removeRequest = saveButton.click()
		await expect.poll(() => removeStarted, { timeout: 10_000 }).toBe(true)
		await expect(saveButton).toHaveText("Removing…")
		await expect(saveButton).toBeDisabled()
		await expect(saveButton).toHaveClass(/btn-loading/)
		releaseRemoveResponse()
		await removeRequest
		await expect(saveButton).toHaveAttribute("aria-pressed", "false")
		await expect(saveButton).toHaveText("♡ Save")
		await expect(saveButton).not.toHaveClass(/btn-loading/)
		await expect(page.locator("#favoritesToast")).toHaveText(
			"Removed from favorites",
		)
	})

	test("back-to-top appears after scrolling and returns smoothly to the hero", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("#home")
		await page.waitForSelector("nav.saas-tenant-mobile-actions", {
			state: "attached",
			timeout: 15_000,
		})
		const termsClose = page.locator("#termsModalCloseBtn")
		if (await termsClose.isVisible()) await termsClose.click()
		await page.locator("#services").scrollIntoViewIfNeeded()
		await expect
			.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
			.toBeGreaterThan(500)
		await expect(page.locator("#backToTop")).toHaveClass(/visible/)
		await expect(page.locator("#backToTop")).toBeVisible()
		const backToTopPosition = await page
			.locator("#backToTop")
			.evaluate((button) => {
				const style = getComputedStyle(button)
				return {
					position: style.position,
					bottom: style.bottom,
					right: style.right,
				}
			})
		expect(backToTopPosition).toMatchObject({
			position: "fixed",
			right: (page.viewportSize()?.width ?? 1280) <= 767 ? "16px" : "30px",
		})
		if ((page.viewportSize()?.width ?? 1280) <= 767) {
			const mobileActionClearance = await page.evaluate(() => {
				const backToTop = document.querySelector("#backToTop")
				const actions = document.querySelector("nav.saas-tenant-mobile-actions")
				if (!backToTop || !actions)
					return { clear: false, buttonBottom: null, actionsTop: null }
				return {
					clear:
						backToTop.getBoundingClientRect().bottom <=
						actions.getBoundingClientRect().top,
					buttonBottom: backToTop.getBoundingClientRect().bottom,
					actionsTop: actions.getBoundingClientRect().top,
				}
			})
			expect(
				mobileActionClearance.clear,
				JSON.stringify(mobileActionClearance),
			).toBe(true)
		}
		await page.locator("#backToTop").click()
		await expect
			.poll(() => page.evaluate(() => window.scrollY), { timeout: 4_000 })
			.toBeLessThan(5)
	})

	test("service category panels contain independent cards with aligned actions", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("nav.saas-tenant-mobile-actions", {
			state: "attached",
			timeout: 15_000,
		})
		const result = await page.locator("#servicesGrid").evaluate((grid) => {
			const groups = Array.from(
				grid.querySelectorAll(":scope > .services-category-group"),
			)
			const cards = Array.from(grid.querySelectorAll(".service-card"))
			const nestedCards = grid.querySelectorAll(
				".service-card .service-card",
			).length
			const actionRows = groups.flatMap((group) => {
				const cardsInGroup = Array.from(
					group.querySelectorAll(
						":scope .services-category-grid > .service-card",
					),
				)
				return cardsInGroup.map((card) => {
					const actions = card.querySelector(".service-card-actions")
					const rect = actions?.getBoundingClientRect()
					return rect ? Math.round(rect.bottom) : -1
				})
			})
			return {
				grouped: grid.classList.contains("is-grouped"),
				groupCount: groups.length,
				cardCount: cards.length,
				nestedCards,
				actionRows,
			}
		})
		expect(result.grouped).toBe(true)
		expect(result.groupCount).toBeGreaterThan(1)
		expect(result.cardCount).toBeGreaterThan(result.groupCount)
		expect(result.nestedCards).toBe(0)
		for (const group of await page.locator(".services-category-group").all()) {
			const rows = await group
				.locator(":scope .services-category-grid > .service-card")
				.evaluateAll((cards) => {
					const byTop = new Map<number, number[]>()
					for (const card of cards) {
						const top = Math.round(card.getBoundingClientRect().top)
						const actions = card.querySelector(".service-card-actions")
						if (!actions) continue
						const bottoms = byTop.get(top) ?? []
						bottoms.push(Math.round(actions.getBoundingClientRect().bottom))
						byTop.set(top, bottoms)
					}
					return Array.from(byTop.values())
				})
			for (const actionBottoms of rows) {
				if (actionBottoms.length > 1) {
					expect(
						Math.max(...actionBottoms) - Math.min(...actionBottoms),
					).toBeLessThanOrEqual(2)
				}
			}
		}
	})

	test("preserves legacy storefront navigation, service filtering, review gating, and motion", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("#home")
		await page.waitForTimeout(1_000)

		await expect(page.locator("#backToTop")).not.toHaveClass(/visible/)
		await expect(page.locator("#reviewAuthHint")).not.toHaveClass(/hidden/, {
			timeout: 15_000,
		})
		await expect(page.locator("#reviewSubmitAuthGate")).not.toHaveClass(
			/hidden/,
			{
				timeout: 15_000,
			},
		)
		await expect(page.locator("#reviewAuthHint")).toContainText(
			"Log in to submit reviews",
		)
		await expect(page.locator("#reviewAuthHint")).toContainText(
			"report abusive reviews",
		)
		await expect(page.locator("#reviewSubmitWrap")).toHaveClass(/hidden/, {
			timeout: 15_000,
		})
		await expect(
			page.locator(".animate-on-scroll.visible").first(),
		).toBeVisible()
		const legacyMotionState = await page
			.locator(".animate-on-scroll")
			.first()
			.evaluate((element) => {
				const style = getComputedStyle(element)
				return {
					transition: style.transition,
				}
			})
		expect(legacyMotionState.transition).toContain("0.8s")
		await expect
			.poll(
				() =>
					page
						.locator(".animate-on-scroll.visible")
						.first()
						.evaluate((element) => getComputedStyle(element).transform),
				{ timeout: 3_000 },
			)
			.toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
		const backToTopState = await page
			.locator("#backToTop")
			.evaluate((element) => {
				const style = getComputedStyle(element)
				const mobile = window.innerWidth < 768
				return {
					position: style.position,
					right: style.right,
					bottom: style.bottom,
					width: style.width,
					height: style.height,
					mobile,
				}
			})
		expect(backToTopState).toMatchObject({
			position: "fixed",
			width: "40px",
			height: "40px",
		})
		expect(backToTopState.right).toBe(backToTopState.mobile ? "16px" : "30px")
		if (!backToTopState.mobile) expect(backToTopState.bottom).toBe("30px")

		await page.locator('.services-tab[data-filter="braids-services"]').click()
		await expect(
			page.locator("#servicesGrid .services-category-group"),
		).toHaveCount(0)
		await expect(page.locator("#servicesGrid > .service-card")).not.toHaveCount(
			0,
		)
		await expect(page.locator("#servicesGrid")).toHaveCSS("display", "grid")
		const selectedCardRects = await page
			.locator("#servicesGrid > .service-card")
			.evaluateAll((cards) =>
				cards.slice(0, 2).map((card) => {
					const rect = card.getBoundingClientRect()
					return {
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height,
					}
				}),
			)
		expect(selectedCardRects.length).toBeGreaterThan(1)
		expect(selectedCardRects[0]).not.toEqual(selectedCardRects[1])

		await page.locator('.services-tab[data-filter="all"]').click()
		await expect(
			page.locator("#servicesGrid .services-category-group"),
		).not.toHaveCount(0)
		await expect(page.locator("#servicesGrid > .service-card")).toHaveCount(0)

		await page.evaluate(() => window.scrollTo({ top: 800, behavior: "auto" }))
		await expect(page.locator("#backToTop")).toHaveClass(/visible/)
		await page.locator("#backToTop").click()
		await expect
			.poll(() => page.evaluate(() => window.scrollY))
			.toBeLessThan(10)
	})

	test("keeps storefront controls readable and cards aligned like the legacy page", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1440, height: 1000 })
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("#home")
		await page.waitForTimeout(1_000)
		await page.locator("#blog").scrollIntoViewIfNeeded()
		await page.locator(".blog-card-image img").first().scrollIntoViewIfNeeded()
		await expect
			.poll(() =>
				page
					.locator(".blog-card-image img")
					.first()
					.evaluate((image) => image.naturalWidth),
			)
			.toBeGreaterThan(0)

		const state = await page.evaluate(() => {
			const home = document.querySelector<HTMLAnchorElement>(
				'.nav a[href="#home"]',
			)
			const readMore = document.querySelector<HTMLAnchorElement>(".read-more")
			const firstCategory = document.querySelector<HTMLElement>(
				"#servicesGrid .services-category-grid",
			)
			const cards = firstCategory
				? Array.from(
						firstCategory.querySelectorAll<HTMLElement>(
							":scope > .service-card",
						),
					).slice(0, 2)
				: []
			const cardRects = cards.map((card) => ({
				left: card.getBoundingClientRect().left,
				top: card.getBoundingClientRect().top,
				width: card.getBoundingClientRect().width,
				actionsTop:
					card
						.querySelector<HTMLElement>(".service-card-actions")
						?.getBoundingClientRect().top ?? -1,
			}))
			const visibleSelects = ["#serviceSelect", "#stylistSelect"]
				.map((selector) => document.querySelector<HTMLSelectElement>(selector))
				.filter((select): select is HTMLSelectElement => Boolean(select))
				.map((select) => getComputedStyle(select).backgroundImage)
			const blogImage = document.querySelector<HTMLImageElement>(
				".blog-card-image img",
			)
			const blogImageBox =
				document.querySelector<HTMLElement>(".blog-card-image")
			return {
				homeColor: home ? getComputedStyle(home).color : "",
				homeOpacity: home ? getComputedStyle(home).opacity : "0",
				readMoreColor: readMore ? getComputedStyle(readMore).color : "",
				readMoreOpacity: readMore ? getComputedStyle(readMore).opacity : "0",
				cardRects,
				selectBackgroundImages: visibleSelects,
				blogImageLoaded: Boolean(
					blogImage?.complete && blogImage.naturalWidth > 0,
				),
				blogImageHeight: blogImageBox?.getBoundingClientRect().height ?? 0,
			}
		})
		expect(state.homeColor).toBe(state.readMoreColor)
		expect(state.homeOpacity).toBe("1")
		expect(state.readMoreOpacity).toBe("1")
		expect(state.cardRects.length).toBe(2)
		expect(state.cardRects[0].left).toBeLessThan(state.cardRects[1].left)
		expect(state.cardRects[0].top).toBe(state.cardRects[1].top)
		expect(state.cardRects[0].actionsTop).toBe(state.cardRects[1].actionsTop)
		expect(state.selectBackgroundImages).toHaveLength(2)
		for (const backgroundImage of state.selectBackgroundImages) {
			expect(backgroundImage).toContain("linear-gradient")
		}
		expect(state.blogImageLoaded).toBe(true)
		expect(state.blogImageHeight).toBeGreaterThanOrEqual(190)
	})

	test("uses the Beauty Sphia logo as the favicon and keeps platform auth readable", async ({
		page,
	}) => {
		await page.addInitScript(() => {
			sessionStorage.setItem("beauty-sphia-platform-splash-seen", "1")
		})
		await page.goto("/login", { waitUntil: "domcontentloaded" })
		await expect(page.locator("#login-title")).toHaveText(
			"Sign in to your salon workspace",
		)
		await expect(page.locator(".auth-provider-btn--google")).toContainText(
			"Continue with Google",
		)
		await expect(page.locator(".auth-password-toggle")).toBeVisible()
		const authState = await page
			.locator(".auth-links a")
			.first()
			.evaluate((link) => {
				const style = getComputedStyle(link)
				return { color: style.color, opacity: style.opacity }
			})
		expect(authState.color).toBe("rgb(237, 204, 131)")
		expect(authState.opacity).toBe("1")

		await page.goto("/", { waitUntil: "domcontentloaded" })
		await page.setViewportSize({ width: 1280, height: 900 })
		await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
			"href",
			/Beauty%20Sphia%20logo\.png|Beauty Sphia logo\.png/,
		)
		const platformLink = page.locator('.platform-nav a[href="/stores"]').first()
		await expect(platformLink).toBeVisible({ timeout: 10_000 })
		await platformLink.hover()
		await expect
			.poll(() => platformLink.evaluate((link) => getComputedStyle(link).color))
			.toBe("rgb(255, 231, 173)")
	})
})
