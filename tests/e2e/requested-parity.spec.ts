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
})
