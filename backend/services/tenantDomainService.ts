import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { resolveTxt } from "node:dns/promises"

import { TenantDomainStatus } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"
import { hasEntitlement } from "@shared/constants/plans"
import { hostnameSchema, registerDomainSchema } from "@shared/validation/domain"

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const MAX_VERIFICATION_ATTEMPTS = 5
const VERIFICATION_PREFIX = "beauty-sphia-verification="

export class TenantDomainError extends Error {
	readonly code = "TENANT_DOMAIN_ERROR" as const
}

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex")
}

export function getVerificationRecord(host: string, token: string) {
	return {
		name: `_beautysphia-verification.${host}`,
		type: "TXT" as const,
		value: VERIFICATION_PREFIX + token,
	}
}

async function assertDomainManager(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: {
			id: true,
			subscription: { select: { plan: { select: { tier: true } } } },
			memberships: {
				where: { userId, status: "ACTIVE" },
				select: {
					tenantId: true,
					userId: true,
					role: true,
					status: true,
					canManageSecurity: true,
					canManageAdmins: true,
					canManageBookings: true,
					canManageContent: true,
				},
			},
		},
	})
	if (!tenant) throw new TenantDomainError("Store not found.")
	const membership = assertTenantMembership(
		tenant.memberships[0] ?? null,
		tenant.id,
	)
	assertTenantPermission(membership, "canManageSecurity")
	const tier = tenant.subscription?.plan.tier.toLowerCase() ?? "starter"
	if (
		!hasEntitlement(
			tier as "starter" | "business" | "enterprise",
			"customDomains",
		)
	)
		throw new TenantDomainError(
			"Custom domains are not available on this plan.",
		)
	return tenant
}

export async function listDomainsForUser(userId: string, tenantSlug: string) {
	const tenant = await assertDomainManager(userId, tenantSlug)
	return prisma.tenantDomain.findMany({
		where: { tenantId: tenant.id, status: { not: TenantDomainStatus.REMOVED } },
		orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
		select: {
			id: true,
			host: true,
			status: true,
			isPrimary: true,
			verifiedAt: true,
			verificationTokenExpiresAt: true,
			verificationAttempts: true,
			lastVerificationAt: true,
		},
	})
}

export async function registerDomainForUser(
	userId: string,
	tenantSlug: string,
	rawInput: unknown,
) {
	const tenant = await assertDomainManager(userId, tenantSlug)
	const { host } = registerDomainSchema.parse(rawInput)
	const token = randomBytes(24).toString("base64url")
	const expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS)
	try {
		const existing = await prisma.tenantDomain.findUnique({
			where: { host },
			select: { tenantId: true },
		})
		if (existing && existing.tenantId !== tenant.id)
			throw new TenantDomainError("That hostname is already registered.")
		const domain = await prisma.tenantDomain.upsert({
			where: { host },
			update: {
				status: TenantDomainStatus.PENDING_VERIFICATION,
				isPrimary: false,
				verifiedAt: null,
				verificationTokenHash: hashToken(token),
				verificationTokenExpiresAt: expiresAt,
				verificationAttempts: 0,
				lastVerificationAt: null,
			},
			create: {
				tenantId: tenant.id,
				host,
				verificationTokenHash: hashToken(token),
				verificationTokenExpiresAt: expiresAt,
			},
			select: {
				id: true,
				host: true,
				status: true,
				verificationTokenExpiresAt: true,
			},
		})
		await syncVercelDomain(host, "add")
		return { ...domain, verification: getVerificationRecord(host, token) }
	} catch (error) {
		if (error instanceof TenantDomainError) throw error
		throw new TenantDomainError("The domain could not be registered.")
	}
}

async function readVerificationTxt(
	host: string,
	expectedTokenHash: string | null,
): Promise<boolean> {
	if (!expectedTokenHash) return false
	try {
		const records = await resolveTxt(`_beautysphia-verification.${host}`)
		return records
			.flat()
			.some(
				(record) =>
					record.startsWith(VERIFICATION_PREFIX) &&
					hashToken(record.slice(VERIFICATION_PREFIX.length)) ===
						expectedTokenHash,
			)
	} catch {
		return false
	}
}

export async function verifyDomainForUser(
	userId: string,
	tenantSlug: string,
	domainId: string,
) {
	const tenant = await assertDomainManager(userId, tenantSlug)
	const domain = await prisma.tenantDomain.findFirst({
		where: { id: domainId, tenantId: tenant.id },
	})
	if (!domain || domain.status === TenantDomainStatus.REMOVED)
		throw new TenantDomainError("Domain not found.")
	if (domain.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS)
		throw new TenantDomainError(
			"Verification retry limit reached. Register the domain again to retry.",
		)
	const now = new Date()
	const expired =
		!domain.verificationTokenExpiresAt ||
		domain.verificationTokenExpiresAt <= now
	const found =
		!expired &&
		(await readVerificationTxt(domain.host, domain.verificationTokenHash))
	const updated = await prisma.tenantDomain.update({
		where: { id: domain.id },
		data: {
			verificationAttempts: { increment: 1 },
			lastVerificationAt: now,
			...(found
				? { status: TenantDomainStatus.VERIFIED, verifiedAt: now }
				: {}),
		},
		select: {
			id: true,
			host: true,
			status: true,
			verifiedAt: true,
			verificationAttempts: true,
		},
	})
	if (!found) {
		if (expired)
			await prisma.tenantDomain.update({
				where: { id: domain.id },
				data: { status: TenantDomainStatus.DISABLED },
			})
		throw new TenantDomainError(
			expired
				? "The DNS verification record has expired. Register the domain again."
				: "The DNS verification record was not found.",
		)
	}
	return updated
}

export async function activateDomainForUser(
	userId: string,
	tenantSlug: string,
	domainId: string,
) {
	const tenant = await assertDomainManager(userId, tenantSlug)
	return prisma.$transaction(async (transaction) => {
		const domain = await transaction.tenantDomain.findFirst({
			where: { id: domainId, tenantId: tenant.id },
		})
		if (
			!domain ||
			(domain.status !== TenantDomainStatus.VERIFIED &&
				domain.status !== TenantDomainStatus.ACTIVE)
		)
			throw new TenantDomainError("Verify the domain before activating it.")
		await transaction.tenantDomain.updateMany({
			where: { tenantId: tenant.id, isPrimary: true },
			data: { isPrimary: false, status: TenantDomainStatus.VERIFIED },
		})
		return transaction.tenantDomain.update({
			where: { id: domain.id },
			data: { status: TenantDomainStatus.ACTIVE, isPrimary: true },
			select: { id: true, host: true, status: true, isPrimary: true },
		})
	})
}

export async function removeDomainForUser(
	userId: string,
	tenantSlug: string,
	domainId: string,
) {
	const tenant = await assertDomainManager(userId, tenantSlug)
	const domain = await prisma.tenantDomain.findFirst({
		where: { id: domainId, tenantId: tenant.id },
	})
	if (!domain) throw new TenantDomainError("Domain not found.")
	await prisma.tenantDomain.update({
		where: { id: domain.id },
		data: { status: TenantDomainStatus.DISABLED, isPrimary: false },
	})
	try {
		await syncVercelDomain(domain.host, "remove")
		return prisma.$transaction(async (transaction) => {
			const removed = await transaction.tenantDomain.update({
				where: { id: domain.id },
				data: { status: TenantDomainStatus.REMOVED },
			})
			if (domain.isPrimary) {
				const fallback = await transaction.tenantDomain.findFirst({
					where: {
						tenantId: tenant.id,
						status: TenantDomainStatus.VERIFIED,
						verifiedAt: { not: null },
					},
					orderBy: { createdAt: "asc" },
				})
				if (fallback)
					await transaction.tenantDomain.update({
						where: { id: fallback.id },
						data: { status: TenantDomainStatus.ACTIVE, isPrimary: true },
					})
			}
			return removed
		})
	} catch {
		throw new TenantDomainError(
			"The domain was disabled, but provider removal must be retried.",
		)
	}
}

export async function resolveTenantSlugByHost(
	hostInput: string | null | undefined,
): Promise<string | null> {
	const host = hostnameSchema.safeParse(hostInput ?? "")
	if (!host.success) return null
	const domain = await prisma.tenantDomain.findFirst({
		where: {
			host: host.data,
			status: TenantDomainStatus.ACTIVE,
			verifiedAt: { not: null },
		},
		select: { tenant: { select: { slug: true, status: true } } },
	})
	if (!domain || domain.tenant.status !== "ACTIVE") return null
	return domain.tenant.slug
}

export function getRequestHost(headers: Headers): string | null {
	const host = headers.get("host")?.split(",", 1)[0]?.trim().toLowerCase()
	const forwardedHost = headers
		.get("x-forwarded-host")
		?.split(",", 1)[0]
		?.trim()
		.toLowerCase()
	if (!host || (forwardedHost && forwardedHost !== host)) return null
	return host.split(":", 1)[0] ?? null
}

async function syncVercelDomain(host: string, operation: "add" | "remove") {
	const token = process.env.VERCEL_API_TOKEN
	const projectId = process.env.VERCEL_PROJECT_ID
	if (!token || !projectId) return
	const response = await fetch(
		`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains${operation === "remove" ? `/${encodeURIComponent(host)}` : ""}`,
		{
			method: operation === "remove" ? "DELETE" : "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: operation === "add" ? JSON.stringify({ name: host }) : undefined,
		},
	)
	if (!response.ok && !(operation === "remove" && response.status === 404))
		throw new TenantDomainError("The hosting provider rejected this domain.")
}
