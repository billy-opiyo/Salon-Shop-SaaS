import "server-only"

import { Prisma } from "@prisma/client"

import { prisma } from "@backend/db/prisma"
import {
	assertTenantMembership,
	assertTenantPermission,
} from "@backend/services/authorization"

export class MerchantServiceCatalogError extends Error {
	readonly code = "MERCHANT_SERVICE_CATALOG_FAILED" as const

	constructor(message: string) {
		super(message)
		this.name = "MerchantServiceCatalogError"
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
	if (!tenant) throw new MerchantServiceCatalogError("Store not found.")
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

export async function listServiceCatalogForUser(
	userId: string,
	tenantSlug: string,
) {
	const tenantId = await getTenantId(userId, tenantSlug)
	return prisma.serviceCategory.findMany({
		where: { tenantId },
		orderBy: { sortOrder: "asc" },
		select: {
			id: true,
			label: true,
			enabled: true,
			services: {
				orderBy: { sortOrder: "asc" },
				select: {
					id: true,
					name: true,
					priceLabel: true,
					durationLabel: true,
					enabled: true,
					orderOnly: true,
				},
			},
		},
	})
}

export async function updateServiceCategoryVisibility(
	userId: string,
	tenantSlug: string,
	categoryId: string,
	enabled: boolean,
): Promise<void> {
	const tenantId = await getTenantId(userId, tenantSlug)
	await prisma.$transaction(async (transaction) => {
		const result = await transaction.serviceCategory.updateMany({
			where: { id: categoryId, tenantId },
			data: { enabled },
		})
		if (result.count !== 1)
			throw new MerchantServiceCatalogError("Service category not found.")
		await transaction.adminAuditLog.create({
			data: {
				tenantId,
				actorUserId: userId,
				action: `service-category.visibility.${enabled ? "enabled" : "disabled"}`,
				resourceType: "service-category",
				resourceId: categoryId,
				metadata: { enabled } as Prisma.InputJsonValue,
			},
		})
	})
}
