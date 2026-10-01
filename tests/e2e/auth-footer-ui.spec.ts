import { expect, test } from "@playwright/test"

test.describe("Beauty Sphia authentication and footer presentation", () => {
	test("sign-in and sign-up share the same auth visual system", async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 900 })
		await page.goto("/login", { waitUntil: "domcontentloaded" })
		const loginStyles = await page.locator(".auth-card").evaluate((card) => {
			const heading = card.querySelector(".auth-card-head h1")
			const field = card.querySelector(".form-group input")
			const submit = card.querySelector(".auth-submit-btn")
			if (!(heading instanceof HTMLElement) || !(field instanceof HTMLInputElement) || !(submit instanceof HTMLElement)) {
				throw new Error("Sign-in visual elements are missing")
			}
			return {
				cardPadding: getComputedStyle(card).padding,
				headingFont: getComputedStyle(heading).font,
				fieldFont: getComputedStyle(field).font,
				fieldRadius: getComputedStyle(field).borderRadius,
				submitHeight: submit.getBoundingClientRect().height,
			}
		})

		await page.goto("/signup", { waitUntil: "domcontentloaded" })
		await expect(page.locator("#signup-title")).toHaveText("Create your workspace account")
		await expect(page.getByRole("textbox", { name: "Your name" })).toBeVisible()
		await expect(page.getByRole("textbox", { name: "Email address" })).toBeVisible()
		await expect(page.getByRole("textbox", { name: "Create a password" })).toBeVisible()
		await expect(page.locator('input[name="turnstileToken"]')).toBeAttached()
		await expect(page.getByRole("link", { name: "Close account creation" })).toBeVisible()

		const signupStyles = await page.locator(".auth-card").evaluate((card) => {
			const heading = card.querySelector(".auth-card-head h1")
			const field = card.querySelector(".form-group input")
			const submit = card.querySelector(".auth-submit-btn")
			if (!(heading instanceof HTMLElement) || !(field instanceof HTMLInputElement) || !(submit instanceof HTMLElement)) {
				throw new Error("Sign-up visual elements are missing")
			}
			return {
				cardPadding: getComputedStyle(card).padding,
				headingFont: getComputedStyle(heading).font,
				fieldFont: getComputedStyle(field).font,
				fieldRadius: getComputedStyle(field).borderRadius,
				submitHeight: submit.getBoundingClientRect().height,
			}
		})
		expect(signupStyles).toEqual(loginStyles)
		await expect(page.locator("#signup-title")).not.toContainText("Bookings")
	})

	test("footer labels remain readable and Policies has its own responsive column", async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 1000 })
		await page.goto("/", { waitUntil: "domcontentloaded" })
		const hero = page.locator(".platform-hero--image")
		const desktopHero = await hero.boundingBox()
		expect(desktopHero).not.toBeNull()
		expect(desktopHero!.x).toBeGreaterThan(0)
		expect(desktopHero!.width).toBeLessThan(1440)
		const platform = page.getByRole("navigation", { name: "Platform", exact: true })
		const policies = page.getByRole("navigation", { name: "Policies", exact: true })
		const connect = page.locator(".platform-footer__social .eyebrow")
		const desktopColumns = await Promise.all([
			platform.boundingBox(),
			policies.boundingBox(),
		])
		expect(desktopColumns[0]).not.toBeNull()
		expect(desktopColumns[1]).not.toBeNull()
		expect(desktopColumns[0]!.x).toBeLessThan(desktopColumns[1]!.x)

		const labelColors = await page.evaluate(() => {
			const selectors = [
				".platform-footer__social .eyebrow",
				".platform-footer__links[aria-label='Platform'] .eyebrow",
				".platform-footer__links[aria-label='Policies'] .eyebrow",
				".platform-header .brand-mark__tagline",
				".platform-home-shell .plan-card__best-for",
			]
			return selectors.map((selector) => {
				const element = document.querySelector<HTMLElement>(selector)
				return element ? getComputedStyle(element).color : null
			})
		})
		expect(labelColors.every((color) => color === "rgb(241, 213, 155)")).toBe(true)
		await expect(connect).toBeVisible()

		await page.setViewportSize({ width: 390, height: 844 })
		const mobileHero = await hero.boundingBox()
		expect(mobileHero).not.toBeNull()
		expect(mobileHero!.x).toBeGreaterThanOrEqual(16)
		expect(mobileHero!.width).toBeLessThanOrEqual(358)
		const mobileColumns = await Promise.all([
			platform.boundingBox(),
			policies.boundingBox(),
		])
		expect(mobileColumns[0]).not.toBeNull()
		expect(mobileColumns[1]).not.toBeNull()
		expect(mobileColumns[0]!.y).toBe(mobileColumns[1]!.y)
		expect(mobileColumns[0]!.x).toBeLessThan(mobileColumns[1]!.x)
		const widths = await page.evaluate(() => ({
			viewport: document.documentElement.clientWidth,
			content: document.documentElement.scrollWidth,
		}))
		expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1)
	})
})
