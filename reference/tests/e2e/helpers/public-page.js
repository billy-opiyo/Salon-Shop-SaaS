const { expect } = require("@playwright/test")
const { installFirebaseMock } = require("./firebase-mock")
const { blockExternalNetwork } = require("./network")
const { watchForUnexpectedPageErrors } = require("./page-errors")

async function openPublicPage(page, options = {}) {
	const { pagePath = "/", splashDurationMs = 0, ...firebaseMockOptions } = options

	await installFirebaseMock(page, firebaseMockOptions)
	await page.addInitScript((durationMs) => {
		window.ROYAL_BRAIDS_SPLASH_DURATION_MS = durationMs
	}, splashDurationMs)
	await blockExternalNetwork(page)
	const pageErrors = watchForUnexpectedPageErrors(page)
	await page.goto(pagePath, { waitUntil: "domcontentloaded" })

	return pageErrors
}

async function completeSplash(page) {
	const splash = page.locator("#siteSplash")

	const splashAlreadyComplete = await page.evaluate(() => {
		return (
			document.body.classList.contains("splash-complete") &&
			!document.body.classList.contains("splash-active")
		)
	})

	if (splashAlreadyComplete) {
		return
	}

	await expect
		.poll(() =>
			page.evaluate(() => typeof window.royalBraidsSplash?.complete),
		)
		.toBe("function")

	await page.evaluate(() => {
		return new Promise((resolve) => {
			document.addEventListener(
				"royalBraids:splashComplete",
				(event) => resolve(event.detail),
				{ once: true },
			)
			window.royalBraidsSplash.complete()
		})
	})

	await expect(splash).toBeHidden()
	await expect(page.locator("body")).toHaveClass(/splash-complete/)
	await expect(page.locator("body")).not.toHaveClass(/splash-active/)
}

async function acceptTerms(page) {
	const termsModal = page.locator("#termsModal")
	const acceptTermsButton = page.locator("#acceptTermsBtn")

	await expect(termsModal).toBeVisible()
	await expect(termsModal).toHaveAttribute("aria-hidden", "false")
	await expect(acceptTermsButton).toBeDisabled()

	await page.locator("#termsConsentCheckbox").check()
	await expect(acceptTermsButton).toBeEnabled()
	await acceptTermsButton.click()

	await expect(termsModal).toBeHidden()
	await expect(termsModal).toHaveAttribute("aria-hidden", "true")
}

async function openPublicPageWithFirebaseMock(page, options = {}) {
	const {
		autoAcceptTerms = true,
		splashDurationMs = 0,
		...mockOptions
	} = options

	const pageErrors = await openPublicPage(page, {
		splashDurationMs,
		...mockOptions,
	})

	if (autoAcceptTerms) {
		await completeSplash(page)
		await acceptTerms(page)
	}

	return pageErrors
}

module.exports = {
	openPublicPage,
	completeSplash,
	acceptTerms,
	openPublicPageWithFirebaseMock,
}