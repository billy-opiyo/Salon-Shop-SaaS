import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
	type TenantMembershipContext,
} from "@backend/services/authorization"

export class MerchantSecurityActionError extends Error {
	readonly code = "MERCHANT_SECURITY_ACTION_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantSecurityActionError"
	}
}

async function getSecurityMembership(
	userId: string,
	tenantSlug: string,
): Promise<TenantMembershipContext> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantSecurityActionError("Store not found.")
	const membership = await prisma.membership.findUnique({
		where: { tenantId_userId: { tenantId: tenant.id, userId } },
		select: {
			tenantId: true,
			userId: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
		},
	})
	const active = assertTenantMembership(membership, tenant.id)
	assertTenantPermission(active, "canManageSecurity")
	return active
}

export async function resolveSecurityAlert(
	userId: string,
	tenantSlug: string,
	alertId: string,
): Promise<void> {
	const membership = await getSecurityMembership(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.securityAlert.updateMany({
			where: { id: alertId, tenantId: membership.tenantId, resolvedAt: null },
			data: { resolvedAt: new Date() },
		})
		if (result.count !== 1)
			throw new MerchantSecurityActionError("Open security alert not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: "security.alert.resolved",
				resourceType: "security-alert",
				resourceId: alertId,
			},
		})
	})
}

export async function restrictTenantUser(
	userId: string,
	tenantSlug: string,
	targetUserId: string,
	durationMinutes: number,
): Promise<void> {
	const membership = await getSecurityMembership(userId, tenantSlug)
	if (
		!Number.isInteger(durationMinutes) ||
		durationMinutes < 1 ||
		durationMinutes > 7 * 24 * 60
	) {
		throw new MerchantSecurityActionError(
			"Restriction duration must be between 1 minute and 7 days.",
		)
	}
	if (userId === targetUserId)
		throw new MerchantSecurityActionError(
			"You cannot restrict your own account.",
		)
	const targetMembership = await prisma.membership.findUnique({
		where: {
			tenantId_userId: { tenantId: membership.tenantId, userId: targetUserId },
		},
		select: { id: true },
	})
	if (!targetMembership)
		throw new MerchantSecurityActionError("Tenant user not found.")
	await prisma.$transaction(async (transaction) => {
		await transaction.user.update({
			where: { id: targetUserId },
			data: { blockedUntil: new Date(Date.now() + durationMinutes * 60_000) },
		})
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: "security.user.restricted",
				resourceType: "user",
				resourceId: targetUserId,
				metadata: { durationMinutes } as Prisma.InputJsonValue,
			},
		})
	})
}

export async function clearTenantUserRestriction(
	userId: string,
	tenantSlug: string,
	targetUserId: string,
): Promise<void> {
	const membership = await getSecurityMembership(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const targetMembership = await transaction.membership.findUnique({
			where: {
				tenantId_userId: {
					tenantId: membership.tenantId,
					userId: targetUserId,
				},
			},
			select: { id: true },
		})
		if (!targetMembership)
			throw new MerchantSecurityActionError("Tenant user not found.")
		await transaction.user.update({
			where: { id: targetUserId },
			data: { blockedUntil: null },
		})
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: "security.user.restriction-cleared",
				resourceType: "user",
				resourceId: targetUserId,
			},
		})
	})
}

export async function forceTenantUserLogout(
	userId: string,
	tenantSlug: string,
	targetUserId: string,
): Promise<void> {
	const membership = await getSecurityMembership(userId, tenantSlug)
	if (userId === targetUserId)
		throw new MerchantSecurityActionError(
			"Use the account sign-out flow for your own session.",
		)
	const targetMembership = await prisma.membership.findUnique({
		where: {
			tenantId_userId: { tenantId: membership.tenantId, userId: targetUserId },
		},
		select: { id: true },
	})
	if (!targetMembership)
		throw new MerchantSecurityActionError("Tenant user not found.")
	await prisma.$transaction(async (transaction) => {
		await transaction.session.deleteMany({ where: { userId: targetUserId } })
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: "security.user.sessions-revoked",
				resourceType: "user",
				resourceId: targetUserId,
			},
		})
	})
}

export async function forceTenantUserPasswordReset(
	userId: string,
	tenantSlug: string,
	targetUserId: string,
): Promise<void> {
	const membership = await getSecurityMembership(userId, tenantSlug)
	if (userId === targetUserId)
		throw new MerchantSecurityActionError(
			"Use the account password flow for your own password.",
		)
	const targetMembership = await prisma.membership.findUnique({
		where: {
			tenantId_userId: { tenantId: membership.tenantId, userId: targetUserId },
		},
		select: { id: true },
	})
	if (!targetMembership)
		throw new MerchantSecurityActionError("Tenant user not found.")
	await prisma.$transaction(async (transaction) => {
		await transaction.user.update({
			where: { id: targetUserId },
			data: { passwordResetRequired: true },
		})
		await transaction.session.deleteMany({ where: { userId: targetUserId } })
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: "security.user.password-reset-required",
				resourceType: "user",
				resourceId: targetUserId,
			},
		})
	})
}

export function toSecurityCsv(snapshot: {
	readonly logins: readonly {
		id: string
		email: string | null
		provider: string
		status: string
		riskLevel: string | null
		createdAt: Date
	}[]
	readonly alerts: readonly {
		id: string
		severity: string
		alertType: string
		message: string
		resolvedAt: Date | null
		createdAt: Date
	}[]
	readonly changes: readonly {
		id: string
		changeType: string
		summary: string
		createdAt: Date
	}[]
}): string {
	const escape = (value: unknown) =>
		`"${String(value ?? "").replaceAll('"', '""')}"`
	const rows = [
		[
			"type",
			"id",
			"email",
			"provider",
			"status",
			"riskLevel",
			"severity",
			"alertType",
			"message",
			"changeType",
			"summary",
			"resolvedAt",
			"createdAt",
		],
		...snapshot.logins.map((item) => [
			"login",
			item.id,
			item.email,
			item.provider,
			item.status,
			item.riskLevel,
			"",
			"",
			"",
			"",
			"",
			"",
			item.createdAt.toISOString(),
		]),
		...snapshot.alerts.map((item) => [
			"alert",
			item.id,
			"",
			"",
			"",
			"",
			item.severity,
			item.alertType,
			item.message,
			"",
			"",
			item.resolvedAt?.toISOString() ?? "",
			item.createdAt.toISOString(),
		]),
		...snapshot.changes.map((item) => [
			"account-change",
			item.id,
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			item.changeType,
			item.summary,
			"",
			item.createdAt.toISOString(),
		]),
	]
	return rows.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n"
}
