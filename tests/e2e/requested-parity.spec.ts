import { expect, test } from "@playwright/test"

test.describe("Requested Beauty Sphia parity fixes", () => {
	test.setTimeout(60_000)

	test("preserves storefront auth, hero, counters, theme, and WhatsApp states", async ({
		page,
	}) => {
		await page.goto("/royal-braids", { waitUntil: "domcontentloaded" })
		await page.waitForSelector("#home")
		await expect(page.locator("#siteSplash")).toHaveAttribute("hidden", "", {
			timeout: 10_000,
		})

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
		await page.waitForTimeout(5_250)

		await expect(page.locator(".splash-screen")).toHaveClass(/splash-hide/)
		await expect(page.locator(".splash-progress-percent")).toHaveText("100%")
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
			splashHidden: document.querySelector("#siteSplash")?.hasAttribute("hidden"),
			bodyHasSplash: document.body.classList.contains("splash-active"),
		}))
		expect(state.splashHidden).toBe(true)
		expect(state.bodyHasSplash).toBe(false)
	})
})
