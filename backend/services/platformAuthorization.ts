import "server-only"

export class PlatformAuthorizationError extends Error {
	readonly code = "PLATFORM_FORBIDDEN" as const

	constructor(message = "Beauty Sphia platform admin access is required.") {
		super(message)
		this.name = "PlatformAuthorizationError"
	}
}

function configuredValues(name: string): Set<string> {
	return new Set(
		(process.env[name] ?? "")
			.split(",")
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean),
	)
}

export function assertPlatformAdmin(
	userId: string,
	email?: string | null,
): void {
	const allowedIds = configuredValues("PLATFORM_ADMIN_USER_IDS")
	const allowedEmails = configuredValues("PLATFORM_ADMIN_EMAILS")
	if (
		!allowedIds.has(userId.trim().toLowerCase()) &&
		!allowedEmails.has((email ?? "").trim().toLowerCase())
	) {
		throw new PlatformAuthorizationError()
	}
}
