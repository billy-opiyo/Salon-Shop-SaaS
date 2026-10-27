import "server-only"

import { PlatformAdminRole as PrismaPlatformAdminRole } from "@prisma/client"

import { prisma } from "@backend/db/prisma"

export type PlatformAdminRole = "OWNER" | PrismaPlatformAdminRole
export type PlatformAdminPermission =
	| "site-content:read"
	| "site-content:write"
	| "support-content:write"
	| "team-content:write"
	| "operations:write"
	| "role-assignments:write"

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

export function isPlatformOwner(userId: string, email?: string | null): boolean {
	const allowedIds = configuredValues("PLATFORM_ADMIN_USER_IDS")
	const allowedEmails = configuredValues("PLATFORM_ADMIN_EMAILS")
	return allowedIds.has(userId.trim().toLowerCase()) ||
		allowedEmails.has((email ?? "").trim().toLowerCase())
}

export async function getPlatformAdminRole(
	userId: string,
	email?: string | null,
): Promise<PlatformAdminRole | null> {
	if (isPlatformOwner(userId, email)) return "OWNER"
	const normalizedEmail = email?.trim().toLowerCase()
	if (!normalizedEmail) return null
	const assignment = await prisma.platformAdminRoleAssignment.findUnique({
		where: { email: normalizedEmail },
		select: { role: true },
	})
	return assignment?.role ?? null
}

export async function assertPlatformAdmin(
	userId: string,
	email?: string | null,
): Promise<PlatformAdminRole> {
	const role = await getPlatformAdminRole(userId, email)
	if (!role) throw new PlatformAuthorizationError()
	return role
}

export async function assertPlatformAdminPermission(
	userId: string,
	email: string | null | undefined,
	permission: PlatformAdminPermission,
): Promise<PlatformAdminRole> {
	const role = await assertPlatformAdmin(userId, email)
	const permissions: Record<PlatformAdminRole, readonly PlatformAdminPermission[]> = {
		OWNER: [
			"site-content:read",
			"site-content:write",
			"support-content:write",
			"team-content:write",
			"operations:write",
			"role-assignments:write",
		],
		STORE_EDITOR: ["site-content:read", "site-content:write", "team-content:write"],
		STORE_SUPPORT: ["site-content:read", "support-content:write"],
	}
	if (!permissions[role].includes(permission))
		throw new PlatformAuthorizationError("Your platform role does not allow this action.")
	return role
}

export async function isPlatformAdmin(
	userId: string,
	email?: string | null,
): Promise<boolean> {
	try {
		return (await getPlatformAdminRole(userId, email)) !== null
	} catch {
		return isPlatformOwner(userId, email)
	}
}
