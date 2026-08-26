import "server-only"

import { Prisma } from "@prisma/client"
import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantTeamError extends Error {
	readonly code = "MERCHANT_TEAM_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantTeamError"
	}
}

export async function listTeamForUser(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantTeamError("Store not found.")
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
	assertTenantPermission(
		assertTenantMembership(membership, tenant.id),
		"canManageAdmins",
	)
	return prisma.membership.findMany({
		where: { tenantId: tenant.id },
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			userId: true,
			role: true,
			status: true,
			canManageAdmins: true,
			canManageBookings: true,
			canManageContent: true,
			canManageSecurity: true,
			invitedAt: true,
			joinedAt: true,
			user: { select: { name: true, email: true } },
		},
	})
}

async function getTeamAdminMembership(userId: string, tenantSlug: string) {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantTeamError("Store not found.")
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
	const activeMembership = assertTenantMembership(membership, tenant.id)
	assertTenantPermission(activeMembership, "canManageAdmins")
	return activeMembership
}

export async function removeTeamMemberForUser(
	userId: string,
	tenantSlug: string,
	memberUserId: string,
): Promise<void> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true, ownerUserId: true },
	})
	if (!tenant) throw new MerchantTeamError("Store not found.")
	await getTeamAdminMembership(userId, tenantSlug)
	if (memberUserId === userId || memberUserId === tenant.ownerUserId) {
		throw new MerchantTeamError(
			"The store owner or your own membership cannot be removed.",
		)
	}
	const result = await prisma.membership.updateMany({
		where: { tenantId: tenant.id, userId: memberUserId, status: "ACTIVE" },
		data: { status: "REMOVED" },
	})
	if (result.count !== 1) throw new MerchantTeamError("Team member not found.")
	await prisma.adminAuditLog.create({
		data: {
			tenantId: tenant.id,
			actorUserId: userId,
			action: "team.member.removed",
			resourceType: "membership",
			resourceId: memberUserId,
		},
	})
}

export async function updateTeamMemberPermissionsForUser(
	userId: string,
	tenantSlug: string,
	memberUserId: string,
	permissions: {
		canManageBookings?: boolean
		canManageContent?: boolean
		canManageSecurity?: boolean
	},
): Promise<void> {
	const membership = await getTeamAdminMembership(userId, tenantSlug)
	if (memberUserId === userId)
		throw new MerchantTeamError("Your own permissions cannot be changed here.")
	const member = await prisma.membership.findUnique({
		where: {
			tenantId_userId: { tenantId: membership.tenantId, userId: memberUserId },
		},
		select: { id: true, role: true },
	})
	if (!member || member.role === "OWNER")
		throw new MerchantTeamError("Team member cannot be updated.")
	await prisma.$transaction(async (transaction) => {
		await transaction.membership.update({
			where: { id: member.id },
			data: permissions,
		})
		await transaction.adminAuditLog.create({
			data: {
				tenantId: membership.tenantId,
				actorUserId: userId,
				action: "team.member.permissions-updated",
				resourceType: "membership",
				resourceId: memberUserId,
				metadata: permissions as Prisma.InputJsonValue,
			},
		})
	})
}
