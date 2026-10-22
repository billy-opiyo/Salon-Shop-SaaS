export function safeMapEmbedUrl(value: unknown, fallback: string): string {
	if (typeof value !== "string" || !value.trim()) return fallback

	const candidate = value.trim()
	try {
		return new URL(candidate).protocol === "https:" ? candidate : fallback
	} catch {
		return fallback
	}
}
