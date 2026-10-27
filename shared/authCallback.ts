const APP_ORIGIN = "https://beauty-sphia.invalid"
const FALLBACK_CALLBACK = "/account"
const ALLOWED_CALLBACK_ROOTS = ["/account", "/manage", "/onboarding", "/platform-admin"] as const

export function getSafeAuthCallbackUrl(
	value: string | string[] | undefined,
): string {
	const candidate = Array.isArray(value) ? value[0] : value
	if (
		!candidate ||
		!candidate.startsWith("/") ||
		candidate.startsWith("//") ||
		/[\\\u0000-\u001f]/.test(candidate)
	)
		return FALLBACK_CALLBACK

	try {
		const url = new URL(candidate, APP_ORIGIN)
		const allowed = ALLOWED_CALLBACK_ROOTS.some(
			(root) => url.pathname === root || url.pathname.startsWith(`${root}/`),
		)
		if (url.origin !== APP_ORIGIN || !allowed) return FALLBACK_CALLBACK
		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return FALLBACK_CALLBACK
	}
}

export function getLoginUrlForPath(path: string): string {
	return `/login?callbackUrl=${encodeURIComponent(getSafeAuthCallbackUrl(path))}`
}
