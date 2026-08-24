/**
 * Intent-based locators for stable test selectors.
 */

function socialWhatsApp(page) {
	return page.getByRole("link", {
		name: "WhatsApp",
		exact: true,
	})
}

function bookingWhatsApp(page) {
	return page.getByRole("link", {
		name: "Quick WhatsApp booking",
		exact: true,
	})
}

module.exports = {
	socialWhatsApp,
	bookingWhatsApp,
}