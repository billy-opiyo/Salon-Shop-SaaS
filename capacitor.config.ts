import type { CapacitorConfig } from "@capacitor/cli"

const target = process.env.CAPACITOR_BUILD_TARGET?.trim()
if (target !== "staging" && target !== "production") {
	throw new Error("Set CAPACITOR_BUILD_TARGET explicitly to staging or production.")
}

const selectedUrl = target === "staging"
	? "https://beauty-sphia-staging.vercel.app"
	: process.env.BEAUTY_SPHIA_PRODUCTION_URL?.trim()
if (!selectedUrl) throw new Error("Production Android builds are unavailable until BEAUTY_SPHIA_PRODUCTION_URL is configured.")

const parsedUrl = new URL(selectedUrl)
if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password) {
	throw new Error("Android builds require a valid HTTPS site URL without embedded credentials.")
}
if (target === "production" && parsedUrl.origin === "https://beauty-sphia-staging.vercel.app") {
	throw new Error("Production Android builds cannot use the staging website origin.")
}

const applicationId = target === "staging" ? "com.beautysphia.app.staging" : "com.beautysphia.app"
if (process.env.CAPACITOR_SERVER_URL && process.env.CAPACITOR_SERVER_URL !== parsedUrl.origin) {
	throw new Error("CAPACITOR_SERVER_URL does not match the selected Android target.")
}
if (process.env.CAPACITOR_APP_ID && process.env.CAPACITOR_APP_ID !== applicationId) {
	throw new Error("CAPACITOR_APP_ID does not match the selected Android target.")
}

const config: CapacitorConfig = {
	appId: applicationId,
	appName: target === "staging" ? "Beauty Sphia Staging" : "Beauty Sphia",
	webDir: "capacitor-shell",
	android: {
		webContentsDebuggingEnabled: target === "staging",
		loggingBehavior: "none",
	},
	server: {
		url: parsedUrl.origin,
		cleartext: false,
		appStartPath: `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}` || "/",
	},
}

export default config
