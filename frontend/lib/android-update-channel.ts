export type AndroidUpdateChannel = "staging" | "production"

export type AndroidUpdateManifest = {
	enabled: true
	channel: AndroidUpdateChannel
	applicationId: string
	versionCode: number
	versionName: string
	apkUrl: string
	signingCertificateSha256: string
	releaseNotes: string
}

export const ANDROID_UPDATE_CHANNELS = Object.freeze({
	staging: Object.freeze({
		origin: "https://beauty-sphia-staging.vercel.app",
		applicationId: "com.beautysphia.app.staging",
		manifestPath: "/downloads/beauty-sphia-staging-update.json",
		apkPath: "/downloads/beauty-sphia-staging.apk",
	}),
	production: Object.freeze({
		applicationId: "com.beautysphia.app",
		manifestPath: "/downloads/beauty-sphia-production-update.json",
		apkPath: "/downloads/beauty-sphia.apk",
	}),
})

function asHttpsOrigin(value: string | undefined): string | null {
	if (!value) return null
	try {
		const parsed = new URL(value)
		if (parsed.protocol !== "https:" || parsed.username || parsed.password
			|| (parsed.port && parsed.port !== "443") || parsed.pathname !== "/" || parsed.search || parsed.hash) return null
		return parsed.origin
	} catch {
		return null
	}
}

export function resolveAndroidWebsiteChannel(origin: string, productionOrigin?: string): AndroidUpdateChannel | null {
	const normalizedOrigin = asHttpsOrigin(origin)
	if (!normalizedOrigin) return null
	if (normalizedOrigin === ANDROID_UPDATE_CHANNELS.staging.origin) return "staging"
	const configuredProductionOrigin = asHttpsOrigin(productionOrigin)
	if (configuredProductionOrigin && configuredProductionOrigin !== ANDROID_UPDATE_CHANNELS.staging.origin
		&& normalizedOrigin === configuredProductionOrigin) return "production"
	return null
}

export function normalizeCertificateSha256(value: string): string | null {
	const normalized = value.replaceAll(":", "").replaceAll(" ", "").trim().toLowerCase()
	return /^[0-9a-f]{64}$/.test(normalized) ? normalized : null
}

export function resolveAndroidUpdateChannel(
	origin: string,
	applicationId: string,
	productionOrigin?: string,
): AndroidUpdateChannel | null {
	try {
		const parsed = new URL(origin)
		if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443")
			|| parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.origin !== origin.replace(/\/$/, "")) return null
		if (applicationId === ANDROID_UPDATE_CHANNELS.staging.applicationId
			&& parsed.origin === ANDROID_UPDATE_CHANNELS.staging.origin) return "staging"
		const configuredProductionOrigin = asHttpsOrigin(productionOrigin)
		if (applicationId === ANDROID_UPDATE_CHANNELS.production.applicationId
			&& configuredProductionOrigin && configuredProductionOrigin !== ANDROID_UPDATE_CHANNELS.staging.origin
			&& parsed.origin === configuredProductionOrigin) return "production"
		return null
	} catch {
		return null
	}
}

export function getAndroidUpdateManifestUrl(channel: AndroidUpdateChannel, origin: string): string {
	return new URL(ANDROID_UPDATE_CHANNELS[channel].manifestPath, origin).toString()
}

export function isNativeUpdateCompatible(hasNativeCompatibilityCheck: boolean, result: unknown): boolean {
	return Boolean(hasNativeCompatibilityCheck && result && typeof result === "object"
		&& "compatible" in result && result.compatible === true)
}

export function validateAndroidUpdateManifest(
	value: unknown,
	channel: AndroidUpdateChannel,
	origin: string,
	installedVersionCode: number,
): AndroidUpdateManifest | null {
	if (!value || typeof value !== "object" || !Number.isSafeInteger(installedVersionCode) || installedVersionCode < 0) return null
	const manifest = value as Record<string, unknown>
	const channelConfig = ANDROID_UPDATE_CHANNELS[channel]
	if (manifest.enabled !== true || manifest.channel !== channel
		|| manifest.applicationId !== channelConfig.applicationId
		|| !Number.isSafeInteger(manifest.versionCode) || (manifest.versionCode as number) <= installedVersionCode
		|| typeof manifest.versionName !== "string" || !/^\d+\.\d+\.\d+$/.test(manifest.versionName)
		|| typeof manifest.apkUrl !== "string" || manifest.apkUrl.startsWith("//")
		|| typeof manifest.signingCertificateSha256 !== "string" || !normalizeCertificateSha256(manifest.signingCertificateSha256)
		|| typeof manifest.releaseNotes !== "string" || manifest.releaseNotes.length > 500) return null
	try {
		const apkUrl = new URL(manifest.apkUrl, origin)
		if (apkUrl.origin !== origin || apkUrl.pathname !== channelConfig.apkPath
			|| apkUrl.username || apkUrl.password || apkUrl.hash) return null
	} catch {
		return null
	}
	return {
		enabled: true,
		channel,
		applicationId: channelConfig.applicationId,
		versionCode: manifest.versionCode as number,
		versionName: manifest.versionName,
		apkUrl: manifest.apkUrl,
		signingCertificateSha256: normalizeCertificateSha256(manifest.signingCertificateSha256)!,
		releaseNotes: manifest.releaseNotes,
	}
}

export function getAndroidAppDownloadPath(channel: AndroidUpdateChannel): string {
	return ANDROID_UPDATE_CHANNELS[channel].apkPath
}
