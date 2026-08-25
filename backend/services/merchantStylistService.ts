import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantStylistError extends Error {
	readonly code = "MERCHANT_STYLIST_FAILED" as const
	constructor(message: string) {
		super(message)
		this.name = "MerchantStylistError"
	}
}

async function getTenantId(
	userId: string,
	tenantSlug: string,
): Promise<string> {
	const tenant = await prisma.tenant.findUnique({
		where: { slug: tenantSlug.trim().toLowerCase() },
		select: { id: true },
	})
	if (!tenant) throw new MerchantStylistError("Store not found.")
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
		"canManageContent",
	)
	return tenant.id
}

export async function listStylistsForUser(userId: string, tenantSlug: string) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.stylist.findMany({
		where: { tenantId },
		orderBy: { createdAt: "asc" },
		select: {
			id: true,
			name: true,
			title: true,
			email: true,
			phone: true,
			active: true,
		},
	})
}

export async function createStylistForUser(
	userId: string,
	tenantSlug: string,
	input: { name: string; title?: string; email?: string; phone?: string },
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	const stylist = await prisma.stylist.create({
		data: {
			tenantId,
			name: input.name,
			title: input.title || null,
			email: input.email || null,
			phone: input.phone || null,
		},
		select: { id: true },
	})
	await prisma.adminAuditLog.create({
		data: {
			tenantId,
			actorUserId: userId,
			action: "stylist.created",
			resourceType: "stylist",
			resourceId: stylist.id,
			metadata: { name: input.name } as Prisma.InputJsonValue,
		},
	})
}

export async function setStylistActiveForUser(
	userId: string,
	tenantSlug: string,
	stylistId: string,
	active: boolean,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	const result = await prisma.stylist.updateMany({
		where: { id: stylistId, tenantId },
		data: { active },
	})
	if (result.count !== 1) throw new MerchantStylistError("Stylist not found.")
}
