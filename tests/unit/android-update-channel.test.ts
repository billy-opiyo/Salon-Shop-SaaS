import { describe, expect, it } from "vitest"

import {
	ANDROID_UPDATE_CHANNELS,
	getAndroidUpdateManifestUrl,
	normalizeCertificateSha256,
	resolveAndroidUpdateChannel,
	resolveAndroidWebsiteChannel,
	validateAndroidUpdateManifest,
} from "../../frontend/lib/android-update-channel"

describe("Android update channels", () => {
	it("resolves only the app ID and HTTPS origin paired for staging", () => {
		expect(resolveAndroidUpdateChannel(
			ANDROID_UPDATE_CHANNELS.staging.origin,
			ANDROID_UPDATE_CHANNELS.staging.applicationId,
		)).toBe("staging")
		expect(resolveAndroidUpdateChannel(
			ANDROID_UPDATE_CHANNELS.staging.origin,
			ANDROID_UPDATE_CHANNELS.production.applicationId,
		)).toBeNull()
		expect(resolveAndroidUpdateChannel(
			"https://beauty-sphia.example",
			ANDROID_UPDATE_CHANNELS.production.applicationId,
		)).toBeNull()
		expect(resolveAndroidUpdateChannel(
			"https://beauty-sphia.example",
			ANDROID_UPDATE_CHANNELS.production.applicationId,
			"https://beauty-sphia.example",
		)).toBe("production")
		expect(resolveAndroidUpdateChannel(
			"https://attacker.example",
			ANDROID_UPDATE_CHANNELS.production.applicationId,
			"https://beauty-sphia.example",
		)).toBeNull()
		expect(resolveAndroidUpdateChannel("http://beauty-sphia-staging.vercel.app", ANDROID_UPDATE_CHANNELS.staging.applicationId)).toBeNull()
	})

	it("selects website download and sign-in channels by exact verified origin", () => {
		expect(resolveAndroidWebsiteChannel("https://beauty-sphia-staging.vercel.app")).toBe("staging")
		expect(resolveAndroidWebsiteChannel("https://preview.vercel.app")).toBeNull()
		expect(resolveAndroidWebsiteChannel("https://beauty-sphia-staging.vercel.app", "https://beauty-sphia.example")).toBe("staging")
		expect(resolveAndroidWebsiteChannel("https://beauty-sphia.example", "https://beauty-sphia.example")).toBe("production")
		expect(resolveAndroidWebsiteChannel("https://other.example", "https://beauty-sphia.example")).toBeNull()
		expect(resolveAndroidWebsiteChannel("https://beauty-sphia-staging.vercel.app/path")).toBeNull()
	})

	it("uses a channel-specific manifest URL on the selected site origin", () => {
		expect(getAndroidUpdateManifestUrl("staging", ANDROID_UPDATE_CHANNELS.staging.origin)).toBe(
			"https://beauty-sphia-staging.vercel.app/downloads/beauty-sphia-staging-update.json",
		)
	})

	it("accepts only newer same-origin APKs with the correct channel identity", () => {
		const manifest = {
			enabled: true,
			channel: "staging",
			applicationId: ANDROID_UPDATE_CHANNELS.staging.applicationId,
			versionCode: 2,
			versionName: "1.0.1",
			apkUrl: "/downloads/beauty-sphia-staging.apk?v=2",
			signingCertificateSha256: "a".repeat(64),
			releaseNotes: "Improved sign-in and offline recovery.",
		}
		expect(validateAndroidUpdateManifest(manifest, "staging", ANDROID_UPDATE_CHANNELS.staging.origin, 1)).toMatchObject({
			channel: "staging",
			applicationId: "com.beautysphia.app.staging",
			versionCode: 2,
		})
		expect(validateAndroidUpdateManifest({ ...manifest, channel: "production" }, "staging", ANDROID_UPDATE_CHANNELS.staging.origin, 1)).toBeNull()
		expect(validateAndroidUpdateManifest({ ...manifest, versionCode: 1 }, "staging", ANDROID_UPDATE_CHANNELS.staging.origin, 1)).toBeNull()
		expect(validateAndroidUpdateManifest({ ...manifest, apkUrl: "https://attacker.example/downloads/beauty-sphia-staging.apk" }, "staging", ANDROID_UPDATE_CHANNELS.staging.origin, 1)).toBeNull()
		expect(validateAndroidUpdateManifest({ ...manifest, apkUrl: "/downloads/beauty-sphia.apk" }, "staging", ANDROID_UPDATE_CHANNELS.staging.origin, 1)).toBeNull()
	})

	it("normalizes only complete SHA-256 certificate fingerprints", () => {
		expect(normalizeCertificateSha256(`${"ab".repeat(32).match(/.{2}/g)?.join(":")}`)).toBe("ab".repeat(32))
		expect(normalizeCertificateSha256("not-a-fingerprint")).toBeNull()
	})
})
