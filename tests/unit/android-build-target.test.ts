import { describe, expect, it } from "vitest"

import {
	ANDROID_BUILD_TARGETS,
	resolveAndroidBuildTarget,
	renderAndroidStrings,
	validateProductionReleaseEnvironment,
} from "../../scripts/android-build.mjs"

describe("Beauty Sphia Android build targets", () => {
	it("binds staging to the confirmed site origin and a separate app ID", () => {
		expect(resolveAndroidBuildTarget({ CAPACITOR_BUILD_TARGET: "staging" })).toEqual({
			target: "staging",
			...ANDROID_BUILD_TARGETS.staging,
		})
		expect(ANDROID_BUILD_TARGETS.staging.applicationId).toBe("com.beautysphia.app.staging")
	})

	it("fails closed for missing, unknown, or conflicting target selections", () => {
		expect(() => resolveAndroidBuildTarget({})).toThrow(/explicitly/)
		expect(() => resolveAndroidBuildTarget({ CAPACITOR_BUILD_TARGET: "preview" })).toThrow(/explicitly/)
		expect(() => resolveAndroidBuildTarget({
			CAPACITOR_BUILD_TARGET: "staging",
			CAPACITOR_SERVER_URL: "https://example.com",
		})).toThrow(/does not match/)
	})

	it("requires an explicit HTTPS production origin and uses a separate app ID", () => {
		expect(() => resolveAndroidBuildTarget({ CAPACITOR_BUILD_TARGET: "production" })).toThrow(/BEAUTY_SPHIA_PRODUCTION_URL/)
		expect(() => resolveAndroidBuildTarget({
			CAPACITOR_BUILD_TARGET: "production",
			BEAUTY_SPHIA_PRODUCTION_URL: "http://beauty-sphia.example",
		})).toThrow(/HTTPS origin/)
		expect(() => resolveAndroidBuildTarget({
			CAPACITOR_BUILD_TARGET: "production",
			BEAUTY_SPHIA_PRODUCTION_URL: "https://beauty-sphia-staging.vercel.app",
		})).toThrow(/cannot use the staging/)
		expect(resolveAndroidBuildTarget({
			CAPACITOR_BUILD_TARGET: "production",
			BEAUTY_SPHIA_PRODUCTION_URL: "https://beauty-sphia.example",
		})).toEqual({
			target: "production",
			...ANDROID_BUILD_TARGETS.production,
			url: "https://beauty-sphia.example",
		})
		expect(ANDROID_BUILD_TARGETS.staging.applicationId).not.toBe(ANDROID_BUILD_TARGETS.production.applicationId)
	})

	it("updates visible app identity and deep-link scheme for each target", () => {
		const initial = `<resources><string name="app_name">Old</string><string name="title_activity_main">Old</string><string name="package_name">old.id</string><string name="custom_url_scheme">old.id</string></resources>`
		const staging = renderAndroidStrings(initial, {
			...ANDROID_BUILD_TARGETS.staging,
			target: "staging",
			url: ANDROID_BUILD_TARGETS.staging.url,
		})
		expect(staging).toContain('<string name="app_name">Beauty Sphia Staging</string>')
		expect(staging).toContain('<string name="custom_url_scheme">com.beautysphia.app.staging</string>')
		const production = renderAndroidStrings(staging, {
			...ANDROID_BUILD_TARGETS.production,
			target: "production",
			url: "https://beauty-sphia.example",
		})
		expect(production).toContain('<string name="app_name">Beauty Sphia</string>')
		expect(production).toContain('<string name="custom_url_scheme">com.beautysphia.app</string>')
	})

it("keeps production releases disabled until launch and signing approval", () => {
		expect(() => validateProductionReleaseEnvironment({
			CAPACITOR_BUILD_TARGET: "production",
			BEAUTY_SPHIA_PRODUCTION_URL: "https://beauty-sphia.example",
		}, "apk")).toThrow(/disabled/)
	})
})
