import { expect, test } from "@playwright/test"

test.describe("Requested Beauty Sphia parity fixes", () => {
	test.setTimeout(60_000)

	test("preserves storefront auth, hero, counters, theme, and WhatsApp states", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("#home")
		await expect(page.locator("#siteSplash")).toHaveCount(0)

		await expect(page.locator("#continueWithGoogleBtn")).toBeAttached()
		await expect(page.locator("#continueWithPhoneBtn")).toHaveCount(0)
		await expect(page.locator("#termsModalCloseBtn")).toBeAttached()
		await expect(page.locator("h1[data-client-html]")).not.toContainText("<span>")
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

	test("completes the platform splash and keeps the plan table horizontally scrollable", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await page.goto("/", { waitUntil: "domcontentloaded" })

		await expect(page.locator(".splash-progress-percent")).toHaveText("100%", {
			timeout: 12_000,
		})
		await expect(page.locator(".splash-screen")).toHaveClass(/splash-hide/, {
			timeout: 4_000,
		})
		const tableState = await page.locator(".plan-comparison").evaluate((table) => ({
			clientWidth: table.clientWidth,
			scrollWidth: table.scrollWidth,
		}))
		expect(tableState.scrollWidth).toBeGreaterThan(tableState.clientWidth)
	})

	test("keeps the compact platform header inside the viewport", async ({ page }) => {
		await page.setViewportSize({ width: 1050, height: 900 })
		await page.goto("/", { waitUntil: "domcontentloaded" })
		await page.waitForTimeout(5_250)
		const state = await page.evaluate(() => ({
			documentWidth: document.documentElement.scrollWidth,
			viewportWidth: window.innerWidth,
			navDisplay: getComputedStyle(document.querySelector(".platform-nav") as Element).display,
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
		const saveButton = page.locator(".gallery-save-favorite-btn").first()
		await expect(saveButton).toBeAttached()
		await expect(saveButton).toHaveAttribute("data-fav-style-id", /\S+/)
		await saveButton.scrollIntoViewIfNeeded()
		await saveButton.hover()
		const saveResponsePromise = page.waitForResponse(
			(response) =>
				response.url().endsWith("/api/favorites") &&
				response.request().method() === "POST",
		)
		await saveButton.click()
		const saveResponse = await saveResponsePromise
		expect(saveResponse.status()).toBe(401)
		await expect(page.locator("#authModal")).toHaveAttribute(
			"aria-hidden",
			"false",
		)
		await expect(page.locator("#authMessage")).toHaveText(
			"Log in to save this gallery style.",
		)
	})

	test("gallery favorites show saving, saved, removal, and toast feedback", async ({
		page,
	}) => {
		let resolveSaveStarted!: () => void
		let releaseSaveResponse!: () => void
		let resolveRemoveStarted!: () => void
		let releaseRemoveResponse!: () => void
		const saveStarted = new Promise<void>((resolve) => {
			resolveSaveStarted = resolve
		})
		const saveResponseGate = new Promise<void>((resolve) => {
			releaseSaveResponse = resolve
		})
		const removeStarted = new Promise<void>((resolve) => {
			resolveRemoveStarted = resolve
		})
		const removeResponseGate = new Promise<void>((resolve) => {
			releaseRemoveResponse = resolve
		})
		await page.addInitScript(() => {
			localStorage.setItem("royal_braids_terms_accepted_v1", "true")
		})
		await page.route("**/api/favorites", async (route) => {
			if (route.request().method() === "POST") {
				resolveSaveStarted()
				await saveResponseGate
				await route.fulfill({ status: 201, json: { favoriteId: "favorite-test" } })
				return
			}
			resolveRemoveStarted()
			await removeResponseGate
			await route.fulfill({ status: 204 })
		})
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("nav.saas-tenant-mobile-actions", {
			state: "attached",
			timeout: 15_000,
		})
		const saveButton = page.locator(".gallery-save-favorite-btn").first()
		await saveButton.scrollIntoViewIfNeeded()
		const saveRequest = saveButton.click()
		await saveStarted
		await expect(saveButton).toHaveText("Saving…")
		await expect(saveButton).toBeDisabled()
		await expect(saveButton).toHaveAttribute("aria-busy", "true")
		await expect(saveButton).toHaveClass(/btn-loading/)
		await expect
			.poll(() => saveButton.evaluate((button) => getComputedStyle(button, "::after").animationName))
			.toBe("rbButtonSpinner")
		releaseSaveResponse()
		await saveRequest
		await expect(saveButton).toHaveAttribute("aria-pressed", "true")
		await expect(saveButton).toHaveText("♥ Saved")
		await expect(saveButton).not.toHaveClass(/btn-loading/)
		await expect(page.locator("#favoritesToast")).toHaveText("Saved to favorites")

		const removeRequest = saveButton.click()
		await removeStarted
		await expect(saveButton).toHaveText("Removing…")
		await expect(saveButton).toBeDisabled()
		await expect(saveButton).toHaveClass(/btn-loading/)
		releaseRemoveResponse()
		await removeRequest
		await expect(saveButton).toHaveAttribute("aria-pressed", "false")
		await expect(saveButton).toHaveText("♡ Save")
		await expect(saveButton).not.toHaveClass(/btn-loading/)
		await expect(page.locator("#favoritesToast")).toHaveText("Removed from favorites")
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
		await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
			.toBeGreaterThan(500)
		await expect(page.locator("#backToTop")).toHaveClass(/visible/)
		await expect(page.locator("#backToTop")).toBeVisible()
		const backToTopPosition = await page.locator("#backToTop").evaluate((button) => {
			const style = getComputedStyle(button)
			return { position: style.position, bottom: style.bottom, right: style.right }
		})
		expect(backToTopPosition).toEqual({
			position: "fixed",
			bottom: (page.viewportSize()?.width ?? 1280) <= 767 ? "76px" : "30px",
			right: (page.viewportSize()?.width ?? 1280) <= 767 ? "16px" : "30px",
		})
		if ((page.viewportSize()?.width ?? 1280) <= 767) {
			const clearOfMobileActions = await page.evaluate(() => {
				const backToTop = document.querySelector("#backToTop")
				const actions = document.querySelector("nav.saas-tenant-mobile-actions")
				if (!backToTop || !actions) return false
				return backToTop.getBoundingClientRect().bottom <= actions.getBoundingClientRect().top
			})
			expect(clearOfMobileActions).toBe(true)
		}
		await page.locator("#backToTop").click()
		await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 4_000 })
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
			const groups = Array.from(grid.querySelectorAll(":scope > .services-category-group"))
			const cards = Array.from(grid.querySelectorAll(".service-card"))
			const nestedCards = grid.querySelectorAll(".service-card .service-card").length
			const actionRows = groups.flatMap((group) => {
				const cardsInGroup = Array.from(group.querySelectorAll(":scope .services-category-grid > .service-card"))
				return cardsInGroup.map((card) => {
					const actions = card.querySelector(".service-card-actions")
					const rect = actions?.getBoundingClientRect()
					return rect ? Math.round(rect.bottom) : -1
				})
			})
			return { grouped: grid.classList.contains("is-grouped"), groupCount: groups.length, cardCount: cards.length, nestedCards, actionRows }
		})
		expect(result.grouped).toBe(true)
		expect(result.groupCount).toBeGreaterThan(1)
		expect(result.cardCount).toBeGreaterThan(result.groupCount)
		expect(result.nestedCards).toBe(0)
		for (const group of await page.locator(".services-category-group").all()) {
			const rows = await group.locator(":scope .services-category-grid > .service-card").evaluateAll((cards) => {
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
					expect(Math.max(...actionBottoms) - Math.min(...actionBottoms)).toBeLessThanOrEqual(2)
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
		await expect(page.locator("#reviewSubmitAuthGate")).not.toHaveClass(/hidden/, {
			timeout: 15_000,
		})
		await expect(page.locator("#reviewAuthHint")).toContainText("Log in to submit reviews")
		await expect(page.locator("#reviewAuthHint")).toContainText("report abusive reviews")
		await expect(page.locator("#reviewSubmitWrap")).toHaveClass(/hidden/, {
			timeout: 15_000,
		})
		await expect(page.locator(".animate-on-scroll.visible").first()).toBeVisible()
		const legacyMotionState = await page.locator(".animate-on-scroll").first().evaluate((element) => {
			const style = getComputedStyle(element)
			return {
				transition: style.transition,
			}
		})
		expect(legacyMotionState.transition).toContain("0.8s")
		await expect.poll(
			() => page.locator(".animate-on-scroll.visible").first().evaluate((element) => getComputedStyle(element).transform),
			{ timeout: 3_000 },
		).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/)
		const backToTopState = await page.locator("#backToTop").evaluate((element) => {
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
		expect(backToTopState.bottom).toBe(backToTopState.mobile ? "76px" : "30px")

		await page.locator('.services-tab[data-filter="braids-services"]').click()
		await expect(page.locator("#servicesGrid .services-category-group")).toHaveCount(0)
		await expect(page.locator("#servicesGrid > .service-card")).not.toHaveCount(0)
		await expect(page.locator("#servicesGrid")).toHaveCSS("display", "grid")
		const selectedCardRects = await page.locator("#servicesGrid > .service-card").evaluateAll((cards) =>
			cards.slice(0, 2).map((card) => {
				const rect = card.getBoundingClientRect()
				return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
			}),
		)
		expect(selectedCardRects.length).toBeGreaterThan(1)
		expect(selectedCardRects[0]).not.toEqual(selectedCardRects[1])

		await page.locator('.services-tab[data-filter="all"]').click()
		await expect(page.locator("#servicesGrid .services-category-group")).not.toHaveCount(0)
		await expect(page.locator("#servicesGrid > .service-card")).toHaveCount(0)

		await page.evaluate(() => window.scrollTo({ top: 800, behavior: "auto" }))
		await expect(page.locator("#backToTop")).toHaveClass(/visible/)
		await page.locator("#backToTop").click()
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10)
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
		await expect.poll(
			() => page.locator(".blog-card-image img").first().evaluate((image) => image.naturalWidth),
		).toBeGreaterThan(0)

		const state = await page.evaluate(() => {
			const home = document.querySelector<HTMLAnchorElement>('.nav a[href="#home"]')
			const readMore = document.querySelector<HTMLAnchorElement>(".read-more")
			const firstCategory = document.querySelector<HTMLElement>(
				"#servicesGrid .services-category-grid",
			)
			const cards = firstCategory
				? Array.from(firstCategory.querySelectorAll<HTMLElement>(":scope > .service-card")).slice(0, 2)
				: []
			const cardRects = cards.map((card) => ({
				left: card.getBoundingClientRect().left,
				top: card.getBoundingClientRect().top,
				width: card.getBoundingClientRect().width,
				actionsTop: card.querySelector<HTMLElement>(".service-card-actions")?.getBoundingClientRect().top ?? -1,
			}))
			const visibleSelects = ["#serviceSelect", "#stylistSelect"]
				.map((selector) => document.querySelector<HTMLSelectElement>(selector))
				.filter((select): select is HTMLSelectElement => Boolean(select))
				.map((select) => getComputedStyle(select).backgroundImage)
			const blogImage = document.querySelector<HTMLImageElement>(".blog-card-image img")
			const blogImageBox = document.querySelector<HTMLElement>(".blog-card-image")
			return {
				homeColor: home ? getComputedStyle(home).color : "",
				homeOpacity: home ? getComputedStyle(home).opacity : "0",
				readMoreColor: readMore ? getComputedStyle(readMore).color : "",
				readMoreOpacity: readMore ? getComputedStyle(readMore).opacity : "0",
				cardRects,
				selectBackgroundImages: visibleSelects,
				blogImageLoaded: Boolean(blogImage?.complete && blogImage.naturalWidth > 0),
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
		await expect(page.locator(".auth-provider-btn--google")).toContainText("Continue with Google")
		await expect(page.locator(".auth-password-toggle")).toBeVisible()
		const authState = await page.locator(".auth-links a").first().evaluate((link) => {
			const style = getComputedStyle(link)
			return { color: style.color, opacity: style.opacity }
		})
		expect(authState.color).toBe("rgb(241, 213, 155)")
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
